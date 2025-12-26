import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, Shield, Users, Search, Clock, ChevronsUpDown } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TeacherPermissionManagementProps {
    users: any[];
    onUpdateUser: () => void;
}

export default function TeacherPermissionManagement({ users, onUpdateUser }: TeacherPermissionManagementProps) {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [viewingSubject, setViewingSubject] = useState<any>(null); // The subject currently being managed

    const teachers = users.filter((u: any) => u.role === 'teacher');

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (res.ok) {
                const data = await res.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error('Failed to fetch subjects', error);
        }
    };

    const getEnrolledStudents = (subjectName: string) => {
        // Find students who have this subject in their enrolledSubjects array OR registeredClasses OR registeredCourses
        return users.filter((u: any) =>
            u.role === 'student' && (
                u.enrolledSubjects?.includes(subjectName) ||
                u.registeredClasses?.some((c: any) => c.className === subjectName) ||
                u.registeredCourses?.some((c: any) => c.subject === subjectName)
            )
        );
    };

    const countStudents = (subjectName: string) => getEnrolledStudents(subjectName).length;

    const handleAssignTeacherToStudent = async (studentId: string, teacherId: string) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${studentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ assignedTeacherId: teacherId })
            });

            if (res.ok) {
                toast.success('บันทึกครูผู้สอนเรียบร้อยแล้ว');
                onUpdateUser();
            } else {
                toast.error('เกิดข้อผิดพลาดในการบันทึก');
            }
        } catch (error) {
            console.error('Error assigning teacher:', error);
            toast.error('Server error');
        }
    };

    // Sort logic for students
    const getSortedStudents = (subjectName: string) => {
        const students = getEnrolledStudents(subjectName);
        const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

        return students.sort((a: any, b: any) => {
            const getTimeInfo = (u: any) => {
                // Try registeredCourses first
                const course = u.registeredCourses?.find((c: any) => c.subject === subjectName);
                let timeStr = '';

                if (course) {
                    timeStr = `${course.day} ${course.time}`;
                } else {
                    // Fallback to legacy registeredClasses
                    const cls = u.registeredClasses?.find((c: any) => c.className === subjectName);
                    timeStr = cls?.classTime || '';
                }

                const dayPart = timeStr.split(' ')[0];
                const timePart = timeStr.split(' ')[1] || '00:00';
                let dayIndex = days.findIndex(d => dayPart.includes(d));
                if (dayIndex === -1) dayIndex = 99;
                return { dayIndex, timePart };
            };

            const tA = getTimeInfo(a);
            const tB = getTimeInfo(b);

            if (tA.dayIndex !== tB.dayIndex) return tA.dayIndex - tB.dayIndex;
            return tA.timePart.localeCompare(tB.timePart);
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'studying':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 rounded-none">Studying (กำลังเรียน)</Badge>;
            case 'drop':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 rounded-none">Drop (ดรอป)</Badge>;
            case 'resigned':
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 rounded-none">Resigned (ลาออก)</Badge>;
            case 'finished':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 rounded-none">Finished (จบหลักสูตร)</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-500 rounded-none">{status || 'Unknown'}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <Card className="rounded-none shadow-sm border border-slate-200">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-800">จัดการสิทธิ์และผู้รับผิดชอบ (Permissions & Mentors)</CardTitle>
                    <p className="text-sm text-slate-500">กำหนดครูประจำวิชาและผู้รับผิดชอบนักเรียนรายวิชา</p>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="py-4 pl-6 w-[250px]">วิชา (Subject)</TableHead>
                                <TableHead className="py-4 w-[150px]">จำนวนนักเรียน</TableHead>
                                <TableHead className="py-4 text-center">จัดการ (Actions)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjects.map((subject) => {
                                const studentCount = countStudents(subject.name);
                                return (
                                    <TableRow key={subject._id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-bold text-slate-700 py-4 pl-6">
                                            {subject.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-slate-400" />
                                                <span>{studentCount} คน</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-none"
                                                onClick={() => setViewingSubject(subject)}
                                            >
                                                <Shield className="w-4 h-4 mr-2" />
                                                กำหนดสิทธิ์ครู
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Management Dialog */}
            <Dialog open={!!viewingSubject} onOpenChange={(o) => !o && setViewingSubject(null)}>
                <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0 rounded-none overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                        <div>
                            <DialogTitle className="text-2xl font-bold text-slate-800">
                                จัดการสิทธิ์: {viewingSubject?.name}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 mt-1">
                                กำหนดครูผู้สอนสำหรับนักเรียนแต่ละคนในวิชานี้ ({viewingSubject ? countStudents(viewingSubject.name) : 0} คน)
                            </DialogDescription>
                        </div>
                        <Button variant="outline" onClick={() => setViewingSubject(null)} className="rounded-none">ปิด</Button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                        <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[25%] py-4 pl-6 font-bold text-slate-700">ชื่อนักเรียน</TableHead>
                                        <TableHead className="w-[15%] py-4 font-bold text-slate-700">สถานะ (Status)</TableHead>
                                        <TableHead className="w-[20%] py-4 font-bold text-slate-700">เวลาเรียน (Class Time)</TableHead>
                                        <TableHead className="w-[40%] py-4 font-bold text-slate-700">ครูผู้รับผิดชอบ (Mentor)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewingSubject && getSortedStudents(viewingSubject.name).map((student: any) => {
                                        // Try to get course from registeredCourses first
                                        const course = student.registeredCourses?.find((c: any) => c.subject === viewingSubject.name);
                                        let classTime = '-';

                                        if (course) {
                                            classTime = `${course.day} ${course.time}`;
                                        } else {
                                            // Fallback to legacy
                                            const registeredClass = student.registeredClasses?.find((c: any) => c.className === viewingSubject.name);
                                            classTime = registeredClass?.classTime || '-';
                                        }

                                        // Fallback logic for display name
                                        const displayName = student.studentName || student.displayName || '-';

                                        return (
                                            <TableRow key={student._id}>
                                                <TableCell className="py-4 pl-6">
                                                    <div>
                                                        <p className="font-bold text-slate-800">{displayName}</p>
                                                        <p className="text-xs text-slate-500">{student.nickname || '-'} ({student.studentClass || '-'})</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(student.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-indigo-400" />
                                                        <span className="font-medium text-slate-700">{classTime}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className="w-full justify-between rounded-none border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                                                            >
                                                                {student.assignedTeacherId
                                                                    ? teachers.find((u: any) => u._id === student.assignedTeacherId)?.displayName || "Select Teacher..."
                                                                    : <span className="text-slate-400">เลือกครูผู้สอน...</span>}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[300px] p-0 rounded-none">
                                                            <Command className="rounded-none">
                                                                <CommandInput placeholder="ค้นหาครู..." className="rounded-none" />
                                                                <CommandEmpty>ไม่พบรายชื่อครู</CommandEmpty>
                                                                <CommandGroup>
                                                                    {teachers.map((teacher: any) => (
                                                                        <CommandItem
                                                                            key={teacher._id}
                                                                            value={teacher.displayName}
                                                                            onSelect={() => {
                                                                                handleAssignTeacherToStudent(student._id, teacher._id);
                                                                            }}
                                                                            className="rounded-none cursor-pointer"
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    student.assignedTeacherId === teacher._id
                                                                                        ? "opacity-100"
                                                                                        : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {teacher.displayName}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {viewingSubject && countStudents(viewingSubject.name) === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-12 text-center text-slate-400">
                                                ไม่มีนักเรียนในรายวิชานี้
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

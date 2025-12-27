'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Search, BookOpen, GraduationCap, User, Calendar, Cpu, Wifi, BarChart3, Cat, Globe, Box, Terminal, Gamepad2, Clock as ClockIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TeacherSidebar from '@/components/dashboard/teacher/TeacherSidebar';
import StudentDetailsDialog from '@/components/dashboard/teacher/StudentDetailsDialog';
import ManageClassDialog from '@/components/dashboard/teacher/ManageClassDialog';
import TeacherScheduleView from '@/components/dashboard/teacher/TeacherScheduleView';
import { API_ENDPOINTS } from '@/lib/api-config';

const ADMIN_EMAIL = 'eq.science.online1@gmail.com';

const EDUCATION_LEVELS: { [key: string]: string } = {
    'k1': 'อนุบาล 1',
    'k2': 'อนุบาล 2',
    'k3': 'อนุบาล 3',
    'p1': 'ประถมศึกษาปีที่ 1',
    'p2': 'ประถมศึกษาปีที่ 2',
    'p3': 'ประถมศึกษาปีที่ 3',
    'p4': 'ประถมศึกษาปีที่ 4',
    'p5': 'ประถมศึกษาปีที่ 5',
    'p6': 'ประถมศึกษาปีที่ 6',
    'm1': 'มัธยมศึกษาปีที่ 1',
    'm2': 'มัธยมศึกษาปีที่ 2',
    'm3': 'มัธยมศึกษาปีที่ 3',
    'm4': 'มัธยมศึกษาปีที่ 4',
    'm5': 'มัธยมศึกษาปีที่ 5',
    'm6': 'มัธยมศึกษาปีที่ 6',
    'vc1': 'ปวช.1',
    'vc2': 'ปวช.2',
    'vc3': 'ปวช.3',
    'bachelor': 'ปริญญาตรี',
    'master': 'ปริญญาโท',
    'doctorate': 'ปริญญาเอก',
    'general': 'บุคคลทั่วไป',
    'other': 'อื่นๆ'
};

function TeacherDashboardContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    // Sidebar Tab State
    const [activeTab, setActiveTab] = useState(tabParam || 'my-courses');

    // Data State
    const [subjects, setSubjects] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);

    // Selection State
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [selectedSubjectForGrading, setSelectedSubjectForGrading] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isClassManagerOpen, setIsClassManagerOpen] = useState(false);
    const [subjectFilter, setSubjectFilter] = useState('all');

    const isMounted = useRef(false);

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const fetchData = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Students
            const studentsRes = await fetch(API_ENDPOINTS.USERS.STUDENTS, { headers });
            let studentData: any[] = [];
            if (studentsRes.ok) {
                studentData = await studentsRes.json();
                if (isMounted.current) setStudents(studentData);
            }

            // Fetch Subjects
            const subjectsRes = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (subjectsRes.ok) {
                const data = await subjectsRes.json();
                if (isMounted.current) {
                    if (user.role === 'admin' || user.email === ADMIN_EMAIL) {
                        setSubjects(data);
                    } else {
                        const authorizedIds = user.authorizedSubjects || [];

                        // [FIX] Also show subjects where the teacher is assigned in registeredCourses
                        const teachableSubjects = new Set<string>(authorizedIds);

                        studentData.forEach(s => {
                            // Check Legacy Assigned Teacher
                            if (s.assignedTeacherId === (user._id || user.id)) {
                                s.enrolledSubjects?.forEach((sub: string) => teachableSubjects.add(sub));
                            }

                            // Check New Registered Courses
                            s.registeredCourses?.forEach((c: any) => {
                                if (c.teacherId === (user._id || user.id)) {
                                    teachableSubjects.add(c.subject); // Add by Name
                                    // Try to find ID if possible, but map mainly relies on Name matching for subject card
                                    const subObj = data.find((d: any) => d.name === c.subject);
                                    if (subObj) teachableSubjects.add(subObj._id);
                                }
                            });
                        });

                        const visibleSubjects = data.filter((s: any) =>
                            teachableSubjects.has(s._id) || teachableSubjects.has(s.name)
                        );
                        setSubjects(visibleSubjects);
                    }
                }
            }

            // Fetch Grades
            const gradesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/grades`, { headers });
            if (gradesRes.ok) {
                const data = await gradesRes.json();
                if (isMounted.current) setGrades(data);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => { fetchData(); }, [user]);

    const myStudents = useMemo(() => {
        if (!user) return [];
        return students.filter(s => {
            if (user.role === 'admin' || user.email === ADMIN_EMAIL) return true;

            // 1. Legacy Check
            if (s.assignedTeacherId === (user._id || user.id)) return true;

            // 2. New Registered Courses Check
            const hasCourseWithTeacher = s.registeredCourses?.some((c: any) => c.teacherId === (user._id || user.id));
            if (hasCourseWithTeacher) return true;

            return false;
        });
    }, [students, user]);

    // Group Students by Subject and Time
    const groupedStudents = useMemo(() => {
        if (!user) return {}; // [FIX] Handle possible null user
        const groups: Record<string, Record<string, any[]>> = {};

        const dayOrder = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

        subjects.forEach(subject => {
            const studentsInSub = myStudents.filter(s => {
                // Legacy Check
                const isLegacyEnrolled = (s.enrolledSubjects?.includes(subject.name) ||
                    s.enrolledSubjects?.includes(subject._id) ||
                    s.registeredClasses?.some((c: any) => c.className === subject.name)) &&
                    s.assignedTeacherId === (user._id || user.id);

                // New Check
                const isRegisteredHere = s.registeredCourses?.some((c: any) =>
                    c.subject === subject.name && c.teacherId === (user._id || user.id)
                );

                return (isLegacyEnrolled || isRegisteredHere) &&
                    (s.status !== 'drop' && s.status !== 'resigned');
            });

            if (studentsInSub.length > 0) {
                const timeGroups: Record<string, any[]> = {};

                studentsInSub.forEach(student => {
                    let timeKey = "ยังไม่ระบุเวลา";

                    // Priority 1: New Registered Courses
                    const reg = student.registeredCourses?.find((c: any) => c.subject === subject.name && c.teacherId === (user._id || user.id));
                    if (reg && reg.day) {
                        timeKey = `${reg.day} | ${reg.time || 'ไม่ระบุเวลา'}`;
                    }
                    // Priority 2: Legacy studyTimes (Take the first one that matches the day/time pattern)
                    else if (student.studyTimes && student.studyTimes.length > 0) {
                        timeKey = student.studyTimes[0];
                    }

                    if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
                    timeGroups[timeKey].push(student);
                });

                // Sort timeGroups keys by day order
                const sortedTimeGroups: Record<string, any[]> = {};
                Object.keys(timeGroups).sort((a, b) => {
                    const dayA = dayOrder.indexOf(a.split(' | ')[0]);
                    const dayB = dayOrder.indexOf(b.split(' | ')[0]);
                    if (dayA !== -1 && dayB !== -1) return dayA - dayB;
                    if (dayA !== -1) return -1;
                    if (dayB !== -1) return 1;
                    return a.localeCompare(b);
                }).forEach(key => {
                    sortedTimeGroups[key] = timeGroups[key];
                });

                groups[subject._id] = sortedTimeGroups;
            } else {
                groups[subject._id] = {};
            }
        });

        return groups;
    }, [myStudents, subjects, user]);

    // Format Date Function (Thai)
    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Icon Helper
    const getSubjectIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('arduino')) return <Cpu className="w-6 h-6 text-white" />;
        if (lower.includes('iot') || lower.includes('internet')) return <Wifi className="w-6 h-6 text-white" />;
        if (lower.includes('data') || lower.includes('science')) return <BarChart3 className="w-6 h-6 text-white" />;
        if (lower.includes('scratch')) return <Cat className="w-6 h-6 text-white" />;
        if (lower.includes('web') || lower.includes('html')) return <Globe className="w-6 h-6 text-white" />;
        if (lower.includes('roblox')) return <Box className="w-6 h-6 text-white" />;
        if (lower.includes('code') || lower.includes('python')) return <Terminal className="w-6 h-6 text-white" />;
        if (lower.includes('microbit')) return <Cpu className="w-6 h-6 text-white" />;
        if (lower.includes('game')) return <Gamepad2 className="w-6 h-6 text-white" />;
        return <BookOpen className="w-6 h-6 text-white" />;
    };


    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex">
            {/* Sidebar */}
            <TeacherSidebar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 transition-all duration-300 ease-in-out">
                <AnimatePresence mode="wait">

                    {/* My Courses View (List View) */}
                    {activeTab === 'my-courses' && (
                        <motion.div
                            key="my-courses"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-8"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-bold text-slate-800">รายวิชาที่สอน</h2>
                                    <p className="text-slate-500 mt-1">
                                        จัดการคะแนนและดูข้อมูลนักเรียนรายวิชา (แสดงเฉพาะนักเรียนในความดูแล)
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-500">กรองวิชา:</span>
                                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                                        <SelectTrigger className="w-[200px] h-10 rounded-none bg-white border-slate-200">
                                            <SelectValue placeholder="ทุกรายวิชา" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            <SelectItem value="all">ทุกรายวิชา</SelectItem>
                                            {subjects.map(s => (
                                                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {subjects
                                    .filter(s => subjectFilter === 'all' || s._id === subjectFilter)
                                    .map(subject => {
                                        const timeGroups = groupedStudents[subject._id] || {};
                                        const totalStudents = Object.values(timeGroups).reduce((acc, curr) => acc + curr.length, 0);

                                        if (totalStudents === 0 && subjectFilter !== 'all') return null;
                                        if (totalStudents === 0) return null;

                                        return (
                                            <Card key={subject._id} className="rounded-none border-slate-200 shadow-sm overflow-hidden bg-white">
                                                <CardHeader className="bg-slate-50 border-b border-slate-200 py-5 px-6 rounded-none">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-indigo-600 p-2.5 rounded-none text-white shadow-sm">
                                                                {getSubjectIcon(subject.name)}
                                                            </div>
                                                            <div>
                                                                <CardTitle className="text-2xl font-bold text-slate-800">{subject.name}</CardTitle>
                                                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                                                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider">
                                                                        {subject.code || 'NO CODE'}
                                                                    </span>
                                                                    <span>|</span>
                                                                    <span className="font-semibold text-indigo-600">นักเรียนรวม {totalStudents} คน</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    {Object.entries(timeGroups).map(([timeSlot, groupStudents], groupIdx) => (
                                                        <div key={timeSlot} className={`${groupIdx > 0 ? 'border-t-4 border-slate-100' : ''}`}>
                                                            {/* Group Header / Subheader */}
                                                            <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-1 bg-indigo-500" />
                                                                    <Badge variant="outline" className="rounded-none border-indigo-200 bg-indigo-50 text-indigo-700 py-1 px-3 font-bold flex items-center gap-2">
                                                                        <ClockIcon className="w-3.5 h-3.5" />
                                                                        เวลาเรียน: {timeSlot}
                                                                    </Badge>
                                                                    <span className="text-xs text-slate-400 font-medium italic">({groupStudents.length} คน)</span>
                                                                </div>
                                                            </div>

                                                            <table className="w-full text-left">
                                                                <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 text-[10px]">
                                                                    <tr>
                                                                        <th className="p-4 pl-6 w-[40%] text-slate-500">ชื่อ-นามสกุลนักเรียน</th>
                                                                        <th className="p-4 w-[20%] text-slate-500">ระดับชั้น</th>
                                                                        <th className="p-4 w-[15%] text-slate-500 text-center">เริ่มคอร์ส</th>
                                                                        <th className="p-4 w-[15%] text-slate-500 text-center">จบคอร์สเรียนวันที่</th>
                                                                        <th className="p-4 w-[10%] text-center text-slate-500">การจัดการ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {groupStudents.map((student) => (
                                                                        <tr key={student._id} className="hover:bg-indigo-50/30 transition-colors group">
                                                                            <td className="p-4 pl-6">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="h-9 w-9 bg-slate-100 rounded-none flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200 group-hover:border-indigo-200 group-hover:bg-white transition-all">
                                                                                        {student.displayName?.charAt(0) || <User className="h-4 w-4" />}
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate max-w-[200px]">{student.studentName || student.displayName}</p>
                                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                                            <p className="text-[10px] text-slate-400 font-mono uppercase">{student.username}</p>
                                                                                            {(() => {
                                                                                                const reg = student.registeredCourses?.find((c: any) =>
                                                                                                    c.subject === subject.name && c.teacherId === (user._id || user.id)
                                                                                                );
                                                                                                if (!reg || reg.totalSessions === undefined) return null;
                                                                                                const used = reg.usedSessions || 0;
                                                                                                const total = reg.totalSessions || 0;
                                                                                                const isNearLimit = total > 0 && used >= total - 1;
                                                                                                const isExceeded = total > 0 && used >= total;

                                                                                                return (
                                                                                                    <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-2">
                                                                                                        <span className={`text-[10px] font-bold ${isExceeded ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-indigo-600'}`}>
                                                                                                            {used}/{total}
                                                                                                        </span>
                                                                                                        {total > 0 && (
                                                                                                            <div className="w-10 h-1 bg-slate-100 overflow-hidden">
                                                                                                                <div
                                                                                                                    className={`h-full ${isExceeded ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-indigo-500'}`}
                                                                                                                    style={{ width: `${Math.min(100, (used / total) * 100)}%` }}
                                                                                                                />
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="p-4 text-slate-600 font-medium text-sm">
                                                                                {EDUCATION_LEVELS[student.educationLevel] || student.educationLevel || '-'}
                                                                            </td>
                                                                            <td className="p-4 text-slate-500 text-xs text-center font-mono">
                                                                                {formatDate(student.startDate)}
                                                                            </td>
                                                                            <td className="p-4 text-slate-500 text-xs text-center font-mono">
                                                                                {(() => {
                                                                                    const reg = student.registeredCourses?.find((c: any) =>
                                                                                        c.subject === subject.name && c.teacherId === (user?._id || user?.id)
                                                                                    );
                                                                                    return formatDate(reg?.endDate || student.endDate);
                                                                                })()}
                                                                            </td>
                                                                            <td className="p-4 text-center">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="ghost"
                                                                                    className="h-8 w-8 p-0 rounded-none text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100"
                                                                                    onClick={() => {
                                                                                        setSelectedStudent(student);
                                                                                        setSelectedSubjectForGrading(subject);
                                                                                        setIsDetailsOpen(true);
                                                                                    }}
                                                                                    title="ลงคะแนน / ประวัติ"
                                                                                >
                                                                                    <GraduationCap className="h-5 w-5" />
                                                                                </Button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}

                                {subjects.length === 0 && (
                                    <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-none">
                                        <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-500 font-medium">คุณยังไม่ได้รับมอบหมายรายวิชาสอน</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Schedule View */}
                    {activeTab === 'schedule' && (
                        <motion.div
                            key="schedule"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TeacherScheduleView
                                students={myStudents}
                                subjects={subjects}
                                user={user}
                            />
                        </motion.div>
                    )}

                </AnimatePresence>

                {/* Modals */}
                <StudentDetailsDialog
                    isOpen={isDetailsOpen}
                    onClose={() => setIsDetailsOpen(false)}
                    student={selectedStudent}
                    subject={selectedSubjectForGrading}
                    teacher={user}
                />
                <ManageClassDialog
                    isOpen={isClassManagerOpen}
                    onClose={() => setIsClassManagerOpen(false)}
                    students={students}
                    onUpdate={fetchData}
                />
            </main>
        </div>
    );
}

export default function TeacherDashboard() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
        }>
            <TeacherDashboardContent />
        </Suspense>
    );
}

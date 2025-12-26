
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Clock, AlertCircle, Save, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config'; // Ensure this is imported

interface TeacherAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacher: any;
}

export default function TeacherAttendanceModal({ isOpen, onClose, teacher }: TeacherAttendanceModalProps) {
    const [step, setStep] = useState(1);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string>(''); // New Text/Input for Time
    const [students, setStudents] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, { status: string, comment: string }>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Subjects on Open & Filter by Authorization
    useEffect(() => {
        if (isOpen) {
            fetchSubjects();
            setStep(1);
            setAttendanceData({});
            setSelectedTime('');
            setStudents([]); // Reset students
        }
    }, [isOpen]);

    // Fetch students when Subject changes to populate Times
    useEffect(() => {
        if (selectedSubject) {
            fetchStudentsAndTimes();
        } else {
            setStudents([]);
            setAvailableTimes([]);
            setSelectedTime('');
        }
    }, [selectedSubject]);

    const [availableTimes, setAvailableTimes] = useState<string[]>([]);

    const fetchSubjects = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.SUBJECTS.LIST);
            if (res.ok) {
                const data = await res.json();

                // Filter subjects based on teacher's authorization
                // If teacher has authorizedSubjects, only show those.
                // Assuming authorizedSubjects contains subject names or IDs. 
                // Let's check against both to be safe, defaulting to all if authorizedSubjects is empty (admin case or unset).
                let filtered = data;
                if (teacher.authorizedSubjects && teacher.authorizedSubjects.length > 0) {
                    filtered = data.filter((s: any) =>
                        teacher.authorizedSubjects.includes(s.name) ||
                        teacher.authorizedSubjects.includes(s._id)
                    );
                }
                setSubjects(filtered);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStudentsAndTimes = async () => {
        setLoading(true);
        try {
            const token = await teacher.getIdToken();
            const res = await fetch(API_ENDPOINTS.USERS.STUDENTS, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const allStudents = await res.json();
                const subjObj = subjects.find(s => s._id === selectedSubject);
                const subjName = subjObj ? subjObj.name : '';

                // 1. Filter students enrolled in this subject
                const enrolled = allStudents.filter((s: any) =>
                    s.enrolledSubjects?.includes(subjName) ||
                    s.enrolledSubjects?.includes(selectedSubject)
                );

                setStudents(enrolled); // Keep all enrolled students in state for now

                // 2. Extract unique times from these students
                // Check 'registeredClasses' structure: { className, classTime }
                const timesSet = new Set<string>();
                enrolled.forEach((s: any) => {
                    if (s.registeredClasses && s.registeredClasses.length > 0) {
                        const regClass = s.registeredClasses.find((rc: any) => {
                            // Robust matching: Check if one includes the other (case-insensitive)
                            const rcName = rc.className.toLowerCase().trim();
                            const sName = subjName.toLowerCase().trim();
                            const sId = selectedSubject.toLowerCase().trim();
                            return rcName.includes(sName) || sName.includes(rcName) || rcName === sId;
                        });

                        if (regClass && regClass.classTime) {
                            timesSet.add(regClass.classTime);
                        }
                    } else if (s.studyTimes && s.studyTimes.length > 0) {
                        // Fallback: If registeredClasses is empty, try studyTimes
                        // But studyTimes doesn't specify subject. We might just add them all 
                        // or user has to strictly rely on new system.
                        // Let's safe guard: Add them.
                        s.studyTimes.forEach((t: string) => timesSet.add(t));
                    }
                });

                // Convert to array and sort
                const sortedTimes = Array.from(timesSet).sort();
                console.log('Extracted Times:', sortedTimes);
                setAvailableTimes(sortedTimes);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            toast.error('ไม่สามารถดึงข้อมูลนักเรียนได้');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        if (!selectedSubject || !selectedDate || !selectedTime) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน (วิชา, วันที่, เวลา)');
            return;
        }

        // Filter students by selected Time
        const subjObj = subjects.find(s => s._id === selectedSubject);
        const subjName = subjObj ? subjObj.name : '';

        const studentsInTimeSlot = students.filter((s: any) => {
            // Robust match for filtering as well
            if (s.registeredClasses && s.registeredClasses.length > 0) {
                const regClass = s.registeredClasses.find((rc: any) => {
                    const rcName = rc.className.toLowerCase().trim();
                    const sName = subjName.toLowerCase().trim();
                    const sId = selectedSubject.toLowerCase().trim();
                    return (rcName.includes(sName) || sName.includes(rcName) || rcName === sId);
                });
                return regClass && regClass.classTime === selectedTime;
            }

            // Fallback for studyTimes
            if (s.studyTimes && s.studyTimes.length > 0) {
                return s.studyTimes.includes(selectedTime);
            }

            return false;
        });

        if (studentsInTimeSlot.length === 0) {
            toast.error(`ไม่พบนักเรียนในช่วงเวลา ${selectedTime}`);
            return;
        }

        // Update the displayed students list to only this batch
        setStudents(studentsInTimeSlot);

        // Initialize default attendance
        const initialData: any = {};
        studentsInTimeSlot.forEach((s: any) => {
            initialData[s._id] = { status: 'Present', comment: '' };
        });
        setAttendanceData(initialData);

        setStep(2);
    };

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleCommentChange = (studentId: string, comment: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], comment }
        }));
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const token = await teacher.getIdToken();
            const subjObj = subjects.find(s => s._id === selectedSubject);

            const payload = {
                subjectId: selectedSubject,
                subjectName: subjObj?.name || 'Unknown',
                date: new Date(selectedDate).toISOString(),
                students: students.map(s => ({
                    studentId: s._id,
                    firstName: s.firstName || s.studentName?.split(' ')[0] || '-',
                    lastName: s.lastName || (s.studentName?.includes(' ') ? s.studentName.split(' ')[1] : '-'),
                    nickname: s.nickname || '',
                    status: attendanceData[s._id]?.status || 'Present',
                    comment: attendanceData[s._id]?.comment || '',
                    time: selectedTime
                }))
            };

            const res = await fetch(API_ENDPOINTS.ATTENDANCE.CREATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('บันทึกการเช็คชื่อเรียบร้อยแล้ว');
                onClose();
            } else {
                const err = await res.json();
                console.error(err);
                toast.error('เกิดข้อผิดพลาด: ' + (err.message || 'Unknown'));
            }

        } catch (error) {
            console.error('Submit error:', error);
            toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setSaving(false);
        }
    };

    // Calculate Summary
    const summary = students.reduce((acc, s) => {
        const st = attendanceData[s._id]?.status || 'Present';
        acc[st] = (acc[st] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <div className="p-6 bg-indigo-600 text-white shadow-md z-10">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Check className="h-6 w-6" />
                        ระบบเช็คชื่อ (Check Attendance)
                    </DialogTitle>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    {step === 1 ? (
                        <div className="max-w-md mx-auto space-y-6 pt-10">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">วันที่ (Date)</label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="h-12 text-lg bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">วิชา (Subject)</label>
                                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger className="h-12 text-lg bg-white">
                                        <SelectValue placeholder="เลือกวิชา..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(s => (
                                            <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">เวลา (Time)</label>
                                <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedSubject || loading}>
                                    <SelectTrigger className="h-12 text-lg bg-white">
                                        <SelectValue placeholder={loading ? "กำลังโหลด..." : "เลือกเวลาเรียน..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTimes.length > 0 ? (
                                            availableTimes.map((time, idx) => (
                                                <SelectItem key={idx} value={time}>{time} น.</SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-slate-400 text-center">ไม่พบเวลาเรียนสำหรับวิชานี้</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleNext}
                                className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 mt-6 shadow-lg"
                                disabled={loading || !selectedTime}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'ตกลง / Next'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Bar */}
                            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center justify-between">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <Check className="h-4 w-4" /> มา: {summary['Present'] || 0}
                                    </div>
                                    <div className="flex items-center gap-2 text-yellow-600 font-bold bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100">
                                        <Clock className="h-4 w-4" /> สาย: {summary['Late'] || 0}
                                    </div>
                                    <div className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                        <AlertCircle className="h-4 w-4" /> ลา: {summary['Leave'] || 0}
                                    </div>
                                    <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                        <X className="h-4 w-4" /> ขาด: {summary['Absent'] || 0}
                                    </div>
                                </div>
                                <div className="text-right text-sm text-slate-500">
                                    <div className="font-semibold">{subjects.find(s => s._id === selectedSubject)?.name}</div>
                                    <div>{new Date(selectedDate).toLocaleDateString('th-TH')} | {selectedTime} น.</div>
                                </div>
                            </div>

                            {/* Large Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-100">
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center font-bold text-slate-700">#</TableHead>
                                            <TableHead className="w-[200px] font-bold text-slate-700">นักเรียน</TableHead>
                                            <TableHead className="text-center font-bold text-slate-700">สถานะ (Status)</TableHead>
                                            <TableHead className="w-[300px] font-bold text-slate-700">หมายเหตุ (Comment)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student, idx) => {
                                            const status = attendanceData[student._id]?.status || 'Present';
                                            return (
                                                <TableRow key={student._id} className="hover:bg-slate-50 h-[70px]">
                                                    <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-lg text-slate-800">
                                                            {student.studentName || student.displayName}
                                                        </div>
                                                        {student.studentClass && <div className="text-xs text-slate-400">{student.studentClass}</div>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-center gap-2">
                                                            {[
                                                                { val: 'Present', icon: Check, color: 'text-green-600', bg: 'bg-green-100' },
                                                                { val: 'Late', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                                                                { val: 'Leave', icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
                                                                { val: 'Absent', icon: X, color: 'text-red-600', bg: 'bg-red-100' }
                                                            ].map((opt) => (
                                                                <button
                                                                    key={opt.val}
                                                                    onClick={() => handleStatusChange(student._id, opt.val)}
                                                                    className={`
                                                                        w-10 h-10 rounded-full flex items-center justify-center transition-all border-2
                                                                        ${status === opt.val
                                                                            ? `${opt.bg} ${opt.color} border-current scale-110 shadow-sm`
                                                                            : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300'
                                                                        }
                                                                    `}
                                                                    title={opt.val}
                                                                >
                                                                    <opt.icon className="w-5 h-5" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            placeholder={status === 'Present' ? '-' : 'ระบุเหตุผล...'}
                                                            className={`h-10 ${status === 'Present' ? 'bg-slate-50 text-slate-300' : 'bg-white'}`}
                                                            disabled={status === 'Present'}
                                                            value={attendanceData[student._id]?.comment || ''}
                                                            onChange={e => handleCommentChange(student._id, e.target.value)}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end gap-3 sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200 z-20">
                                <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-6">
                                    ย้อนกลับ
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 text-lg shadow-lg"
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                                    ส่งข้อมูล (Submit)
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

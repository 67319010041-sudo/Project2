'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SchoolSearchInput } from '@/components/ui/SchoolSearchInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, User, GraduationCap, Calendar, Lock, Key, Cpu, Wifi, BarChart3, Cat, Globe, Box, Terminal, Gamepad2, BookOpen, Settings, Edit2, Trash2, X, Plus, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const EDUCATION_LEVELS = [
    { value: 'k1', label: 'อนุบาล 1' },
    { value: 'k2', label: 'อนุบาล 2' },
    { value: 'k3', label: 'อนุบาล 3' },
    { value: 'p1', label: 'ประถมศึกษาปีที่ 1' },
    { value: 'p2', label: 'ประถมศึกษาปีที่ 2' },
    { value: 'p3', label: 'ประถมศึกษาปีที่ 3' },
    { value: 'p4', label: 'ประถมศึกษาปีที่ 4' },
    { value: 'p5', label: 'ประถมศึกษาปีที่ 5' },
    { value: 'p6', label: 'ประถมศึกษาปีที่ 6' },
    { value: 'm1', label: 'มัธยมศึกษาปีที่ 1' },
    { value: 'm2', label: 'มัธยมศึกษาปีที่ 2' },
    { value: 'm3', label: 'มัธยมศึกษาปีที่ 3' },
    { value: 'm4', label: 'มัธยมศึกษาปีที่ 4' },
    { value: 'm5', label: 'มัธยมศึกษาปีที่ 5' },
    { value: 'm6', label: 'มัธยมศึกษาปีที่ 6' },
    { value: 'vc1', label: 'ปวช.1' },
    { value: 'vc2', label: 'ปวช.2' },
    { value: 'vc3', label: 'ปวช.3' },
    { value: 'bachelor', label: 'ปริญญาตรี' },
    { value: 'master', label: 'ปริญญาโท' },
    { value: 'doctorate', label: 'ปริญญาเอก' },
    { value: 'general', label: 'บุคคลทั่วไป' },
    { value: 'other', label: 'อื่นๆ' },
];

const STUDY_TIMES = [
    '10:00 - 12:00',
    '13:00 - 15:00',
    '15:00 - 17:00',
    '15:30 - 17:30',
    '16:00 - 18:00',
    '16:30 - 18:30',
    '17:00 - 19:00',
    '17:30 - 19:30',
    '18:00 - 20:00',
    '20:00 - 22:00',
    'อื่นๆ (ระบุเวลาเอง)'
];

const DAYS = [
    'จันทร์',
    'อังคาร',
    'พุธ',
    'พฤหัสบดี',
    'ศุกร์',
    'เสาร์',
    'อาทิตย์'
];

interface RegisteredCourse {
    name: string;
    teacherId: string;
    teacherName: string;
    day: string;
    time: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    totalSessions: number;
}

interface Subject {
    _id: string;
    name: string;
}

export default function CreateUser() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        parentName: '',
        studentName: '',
        school: '',
        educationLevel: '',
    });

    // Subject & Time State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([]);

    // Dialog State for Course Selection
    const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<string | null>(null);
    const [tempDay, setTempDay] = useState('');
    const [tempTime, setTempTime] = useState('');
    const [tempCustomTime, setTempCustomTime] = useState('');
    const [tempTeacherId, setTempTeacherId] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');
    const [tempTotalSessions, setTempTotalSessions] = useState(4);

    const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');



    const [teachers, setTeachers] = useState<{ _id: string, displayName: string, email: string }[]>([]);



    const fetchTeachers = async () => {
        try {
            const token = await user?.getIdToken();
            // Assuming we have an endpoint to get teachers. If not, filtered users.
            // Using /users/pending-teachers as a base or if there is a general teacher list
            // For now, let's assume we can filter from all users or there is a specific endpoint.
            // Converting to use a direct fetch for teachers if endpoint exists, otherwise filter from all users

            // Let's try to fetch all users and filter for teachers if no dedicated endpoint
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const teacherList = data.filter((u: any) => u.role === 'teacher' && u.isApproved);
                setTeachers(teacherList);
            }
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects`);
            if (res.ok) {
                const data = await res.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    useEffect(() => {
        fetchSubjects();
        if (user) fetchTeachers();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubjectClick = (subjectName: string) => {
        const isSelected = registeredCourses.some(s => s.name === subjectName);

        if (isSelected) {
            setRegisteredCourses(prev => prev.filter(s => s.name !== subjectName));
        } else {
            setCurrentSubject(subjectName);
            setTempDay('');
            setTempTime('');
            setTempCustomTime('');
            setTempTeacherId('');
            setTempStartDate('');
            setTempEndDate('');
            setTempTotalSessions(4);
            setIsCourseDialogOpen(true);
        }
    };

    const confirmCourseSelection = () => {
        if (!tempTeacherId) {
            toast.error('กรุณาเลือกครูผู้สอน');
            return;
        }
        if (!tempStartDate) {
            toast.error('กรุณาระบุวันเริ่มเรียน');
            return;
        }
        if (!tempEndDate) {
            toast.error('กรุณาระบุวันสิ้นสุด');
            return;
        }
        if (!tempDay) {
            toast.error('กรุณาเลือกวันที่เรียน');
            return;
        }
        if (!tempTime) {
            toast.error('กรุณาเลือกเวลาเรียน');
            return;
        }
        if (tempTime === 'อื่นๆ (ระบุเวลาเอง)' && !tempCustomTime) {
            toast.error('กรุณาระบุเวลาที่สะดวก');
            return;
        }

        if (currentSubject) {
            let finalTime: string;

            if (tempTime === 'อื่นๆ (ระบุเวลาเอง)') {
                finalTime = `${tempCustomTime}`; // Used to be day + time, but better to keep just time if day is selected separate? Protocol was day + time.
                // Reverting to previous logic: Day is separate in UI but maybe stored together?
                // backend schema: day, time.
                // Previous logic: finalTime = `${tempDay} ${tempTime}`
            } else {
                finalTime = tempTime;
            }

            const teacherObj = teachers.find(t => t._id === tempTeacherId);

            setRegisteredCourses(prev => [
                ...prev,
                {
                    name: currentSubject,
                    teacherId: tempTeacherId,
                    teacherName: teacherObj?.displayName || 'Unknown',
                    day: tempDay,
                    time: finalTime,
                    startDate: tempStartDate,
                    endDate: tempEndDate,
                    totalSessions: tempTotalSessions
                }
            ]);
            setIsCourseDialogOpen(false);
            setCurrentSubject(null);
        }
    };

    const handleCreateUser = async () => {
        if (!formData.username || !formData.password || !formData.parentName || !formData.studentName || !formData.educationLevel || !formData.school) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (registeredCourses.length === 0) {
            toast.error('กรุณาเลือกวิชาที่เรียนอย่างน้อย 1 วิชา');
            return;
        }

        const url = `${process.env.NEXT_PUBLIC_API_URL}/api/users`;
        console.log('Creating user at:', url);

        setLoading(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: formData.username,
                    passwordHash: formData.password,
                    parentName: formData.parentName,
                    studentName: formData.studentName,
                    school: formData.school,
                    educationLevel: formData.educationLevel,
                    // Use new structure
                    registeredCourses: registeredCourses.map(c => ({
                        subject: c.name,
                        teacherId: c.teacherId,
                        teacherName: c.teacherName,
                        day: c.day,
                        time: c.time,
                        startDate: new Date(c.startDate),
                        endDate: new Date(c.endDate),
                        totalSessions: c.totalSessions
                    })),
                    // Backward compatibility (optional, can send empty or mapped from first course)
                    role: 'student',
                    enrolledSubjects: registeredCourses.map(c => c.name),
                    studyTimes: registeredCourses.map(c => `${c.day} ${c.time}`),
                    assignedTeacherId: registeredCourses[0]?.teacherId, // Main teacher fallback
                    startDate: registeredCourses[0] ? new Date(registeredCourses[0].startDate) : undefined,
                })
            });

            if (res.ok) {
                setSuccess(true);
                toast.success('สร้างผู้ใช้สำเร็จ');
                // Reset form after 2 seconds
                setTimeout(() => {
                    setSuccess(false);
                    setFormData({
                        username: '',
                        password: '',
                        parentName: '',
                        studentName: '',
                        school: '',
                        educationLevel: '',
                    });
                    setRegisteredCourses([]);
                }, 2000);
            } else {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create user');
            }

        } catch (error: unknown) {
            console.error('Create user error:', error);
            if (error instanceof Error && error.message.includes('USERNAME_ALREADY_EXISTS')) {
                toast.error('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
            } else {
                toast.error('เกิดข้อผิดพลาดในการสร้างผู้ใช้');
            }
        } finally {
            setLoading(false);
        }
    };

    // Subject Management Logic
    const [isManageSubjectsDialogOpen, setIsManageSubjectsDialogOpen] = useState(false);
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [editSubjectName, setEditSubjectName] = useState('');

    const handleStartEditSubject = (subject: Subject) => {
        setEditingSubjectId(subject._id);
        setEditSubjectName(subject.name);
    };

    const handleCancelEditSubject = () => {
        setEditingSubjectId(null);
        setEditSubjectName('');
    };

    const handleUpdateSubject = async (id: string) => {
        if (!editSubjectName.trim()) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: editSubjectName })
            });

            if (res.ok) {
                toast.success('อัปเดตชื่อวิชาสำเร็จ');
                setEditingSubjectId(null);
                fetchSubjects(); // Refresh list
            } else {
                throw new Error('Failed to update');
            }
        } catch (error) {
            toast.error('ไม่สามารถอัปเดตชื่อวิชาได้');
        }
    };

    const handleDeleteSubject = async (id: string, name: string) => {
        if (!confirm(`คุณต้องการลบวิชา "${name}" ใช่หรือไม่?`)) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                toast.success('ลบวิชาสำเร็จ');
                fetchSubjects(); // Refresh list
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            toast.error('ไม่สามารถลบวิชาได้');
        }
    };


    const handleAddSubject = async () => {
        if (!newSubjectName.trim()) return;

        try {
            const token = await user?.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subjects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: newSubjectName })
            });

            if (res.ok) {
                toast.success('เพิ่มรายวิชาสำเร็จ');
                setNewSubjectName('');
                setIsAddSubjectDialogOpen(false);
                fetchSubjects();
            } else {
                throw new Error('Failed to add subject');
            }
        } catch (error) {
            toast.error('ไม่สามารถเพิ่มรายวิชาได้');
        }
    };



    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 h-full bg-white rounded-none border border-slate-200 shadow-sm">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                    <div className="h-32 w-32 rounded-none bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-20 w-20 text-emerald-600" />
                    </div>
                </motion.div>
                <div className="text-center">
                    <h3 className="text-3xl font-bold text-emerald-700 font-itim">สร้างผู้ใช้สำเร็จ!</h3>
                    <p className="text-gray-500 mt-2 text-lg">ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว</p>
                </div>
                <Button onClick={() => setSuccess(false)} className="mt-4 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white">
                    สร้างผู้ใช้เพิ่ม
                </Button>
            </div>
        );
    }



    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-none border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 rounded-none flex items-center justify-center text-indigo-600 border border-indigo-100">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">สร้างผู้ใช้งานใหม่</h2>
                            <p className="text-sm text-slate-500">กรอกข้อมูลเพื่อสร้างบัญชีนักเรียน</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsManageSubjectsDialogOpen(true)}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-none"
                            title="จัดการรายวิชา (แก้ไข/ลบ)"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            จัดการรายวิชา
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddSubjectDialogOpen(true)}
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-none"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            เพิ่มรายวิชา
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username" className="font-semibold text-gray-700">Username</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input
                                id="username"
                                name="username"
                                placeholder="ตั้งชื่อผู้ใช้"
                                value={formData.username}
                                onChange={handleChange}
                                className="pl-10 h-11 rounded-none border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="font-semibold text-gray-700">Password</Label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input
                                id="password"
                                name="password"
                                type="text" // Show password for admin to see
                                placeholder="ตั้งรหัสผ่าน"
                                value={formData.password}
                                onChange={handleChange}
                                className="pl-10 h-11 rounded-none border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Parent Name */}
                    <div className="space-y-2">
                        <Label htmlFor="parentName" className="font-semibold text-gray-700">ชื่อผู้ปกครอง</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                            <Input
                                id="parentName"
                                name="parentName"
                                placeholder="กรอกชื่อ-นามสกุล"
                                value={formData.parentName}
                                onChange={handleChange}
                                className="pl-10 h-11 rounded-none border-slate-200 border-l-4 border-l-blue-500"
                            />
                        </div>
                    </div>

                    {/* Student Name */}
                    <div className="space-y-2">
                        <Label htmlFor="studentName" className="font-semibold text-gray-700">ชื่อนักเรียน</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-orange-500" />
                            <Input
                                id="studentName"
                                name="studentName"
                                placeholder="กรอกชื่อ-นามสกุล"
                                value={formData.studentName}
                                onChange={handleChange}
                                className="pl-10 h-11 rounded-none border-slate-200 border-l-4 border-l-orange-500"
                            />
                        </div>
                    </div>

                    {/* School */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="font-semibold text-gray-700">โรงเรียน</Label>
                        <div className="flex gap-3 items-start">
                            <div className="flex-1">
                                <SchoolSearchInput
                                    value={formData.school}
                                    onSelect={(val) => handleSelectChange('school', val)}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSelectChange('school', 'อื่นๆ')}
                                className={`h-11 px-6 rounded-none border transition-all ${formData.school === 'อื่นๆ'
                                    ? 'bg-pink-500 border-pink-500 text-white'
                                    : 'border-slate-200 hover:border-pink-500 hover:text-pink-500 bg-white'
                                    }`}
                            >
                                อื่นๆ
                            </Button>
                        </div>
                    </div>

                    {/* Education Level */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <Label className="font-semibold text-gray-700">ระดับการศึกษา</Label>
                        <div className="relative">
                            <GraduationCap className="absolute left-3 top-3 h-5 w-5 text-purple-500 z-10" />
                            <Select
                                value={formData.educationLevel}
                                onValueChange={(val) => handleSelectChange('educationLevel', val)}
                            >
                                <SelectTrigger className="pl-10 h-11 rounded-none border-slate-200 border-l-4 border-l-purple-500">
                                    <SelectValue placeholder="เลือกระดับ" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    {EDUCATION_LEVELS.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>
                                            {level.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>



                    {/* Subjects Grid */}
                    <div className="space-y-3 mt-6">
                        <Label className="font-semibold text-gray-700">วิชาที่เรียน</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {subjects.map((subject) => {
                                const isSelected = registeredCourses.some(s => s.name === subject.name);
                                const selectedData = registeredCourses.find(s => s.name === subject.name);

                                // Dynamic Icon Logic
                                const getSubjectIcon = (name: string) => {
                                    const lower = name.toLowerCase();
                                    if (lower.includes('arduino')) return <Cpu className={`w-8 h-8 ${isSelected ? 'text-cyan-200' : 'text-cyan-500'}`} />;
                                    if (lower.includes('iot') || lower.includes('internet')) return <Wifi className={`w-8 h-8 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`} />;
                                    if (lower.includes('data') || lower.includes('science')) return <BarChart3 className={`w-8 h-8 ${isSelected ? 'text-emerald-200' : 'text-emerald-500'}`} />;
                                    if (lower.includes('scratch')) return <Cat className={`w-8 h-8 ${isSelected ? 'text-orange-200' : 'text-orange-500'}`} />;
                                    if (lower.includes('web') || lower.includes('html')) return <Globe className={`w-8 h-8 ${isSelected ? 'text-indigo-200' : 'text-indigo-500'}`} />;
                                    if (lower.includes('roblox')) return <Box className={`w-8 h-8 ${isSelected ? 'text-red-200' : 'text-red-500'}`} />;
                                    if (lower.includes('code') || lower.includes('python')) return <Terminal className={`w-8 h-8 ${isSelected ? 'text-yellow-200' : 'text-yellow-500'}`} />;
                                    if (lower.includes('microbit')) return <Cpu className={`w-8 h-8 ${isSelected ? 'text-green-200' : 'text-green-500'}`} />;
                                    if (lower.includes('game')) return <Gamepad2 className={`w-8 h-8 ${isSelected ? 'text-purple-200' : 'text-purple-500'}`} />;
                                    return <BookOpen className={`w-8 h-8 ${isSelected ? 'text-slate-200' : 'text-slate-400'}`} />;
                                };

                                return (
                                    <div
                                        key={subject._id}
                                        className={`flex flex-col items-center justify-center p-4 rounded-none cursor-pointer border transition-all h-full min-h-[120px] relative gap-3 ${isSelected
                                            ? 'bg-indigo-600 border-indigo-600 shadow-md transform scale-[1.02]'
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                            }`}
                                        onClick={() => handleSubjectClick(subject.name)}
                                    >
                                        <div className={`p-3 rounded-none ${isSelected ? 'bg-white/20' : 'bg-slate-50'}`}>
                                            {getSubjectIcon(subject.name)}
                                        </div>

                                        <span className={`text-sm font-bold text-center ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                            {subject.name}
                                        </span>

                                        {isSelected && <div className="absolute top-2 right-2">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        </div>}

                                        {isSelected && selectedData && (
                                            <div className="mt-1 text-xs text-indigo-100 bg-white/10 px-2 py-1 rounded-none text-center max-w-full truncate w-full border border-white/20">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="truncate">{selectedData.day} {selectedData.time}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button
                            type="button"
                            className="w-full h-12 text-lg rounded-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            onClick={handleCreateUser}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            {loading ? 'กำลังบันทึก...' : 'สร้างบัญชีผู้ใช้'}
                        </Button>
                    </div>
                </div>

                {/* Course Selection Dialog */}
                <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                    <DialogContent className="sm:max-w-2xl rounded-none border-slate-200 p-0 overflow-hidden">
                        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
                            <DialogTitle className="text-xl font-bold font-itim flex items-center gap-2">
                                <span>ตั้งค่าการเรียนสำหรับวิชา:</span>
                                <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-none border border-indigo-100">{currentSubject}</span>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-6">
                            {/* Row 1: Teacher & Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">ครูผู้สอน <span className="text-red-500">*</span></Label>
                                    <Select value={tempTeacherId} onValueChange={setTempTeacherId}>
                                        <SelectTrigger className="h-11 rounded-none border-slate-200">
                                            <SelectValue placeholder="เลือกครู" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none max-h-[200px]">
                                            {teachers.map((t) => (
                                                <SelectItem key={t._id} value={t._id}>{t.displayName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">เริ่มเรียน <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        className="h-11 rounded-none border-slate-200"
                                        value={tempStartDate}
                                        onChange={(e) => setTempStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">สิ้นสุด <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="date"
                                        className="h-11 rounded-none border-slate-200"
                                        value={tempEndDate}
                                        onChange={(e) => setTempEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />

                            {/* Row 2: Day & Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">วันที่เรียน <span className="text-red-500">*</span></Label>
                                    <Select value={tempDay} onValueChange={setTempDay}>
                                        <SelectTrigger className="h-11 rounded-none border-slate-200">
                                            <SelectValue placeholder="เลือกวัน" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            {DAYS.map((day) => (
                                                <SelectItem key={day} value={day}>{day}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-semibold text-slate-700">เวลาเรียน <span className="text-red-500">*</span></Label>
                                    <Select value={tempTime} onValueChange={setTempTime}>
                                        <SelectTrigger className="h-11 rounded-none border-slate-200">
                                            <SelectValue placeholder="เลือกเวลา" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            {STUDY_TIMES.map((time) => (
                                                <SelectItem key={time} value={time}>{time}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {tempTime === 'อื่นๆ (ระบุเวลาเอง)' && (
                                <div className="space-y-2 bg-yellow-50 p-4 border border-yellow-100 rounded-none">
                                    <Label className="font-semibold text-yellow-800">ระบุเวลาเอง</Label>
                                    <Input
                                        placeholder="เช่น 10:00 - 12:00"
                                        value={tempCustomTime}
                                        onChange={(e) => setTempCustomTime(e.target.value)}
                                        className="h-11 rounded-none border-yellow-200 focus:border-yellow-400 focus:ring-yellow-200"
                                    />
                                </div>
                            )}

                            <div className="h-px bg-slate-100 w-full" />

                            {/* Row 3: Quota Selection */}
                            <div className="p-4 bg-slate-50 border border-slate-200">
                                <Label className="text-indigo-700 font-bold mb-3 block text-sm">โควตาจำนวนครั้งที่เรียน (Course Quota)</Label>
                                <div className="flex items-center gap-4">
                                    <Select
                                        value={[4, 12, 24, 48].includes(tempTotalSessions) ? tempTotalSessions.toString() : "0"}
                                        onValueChange={(val) => setTempTotalSessions(parseInt(val))}
                                    >
                                        <SelectTrigger className="h-11 rounded-none border-slate-200 bg-white flex-1 text-sm">
                                            <SelectValue placeholder="เลือกจำนวนครั้ง" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            <SelectItem value="4">4 ครั้ง (คอร์ส 1 เดือน)</SelectItem>
                                            <SelectItem value="12">12 ครั้ง (คอร์ส 3 เดือน)</SelectItem>
                                            <SelectItem value="24">24 ครั้ง (คอร์ส 6 เดือน)</SelectItem>
                                            <SelectItem value="48">48 ครั้ง (คอร์ส 1 ปี)</SelectItem>
                                            <SelectItem value="0">กำหนดเอง (Custom)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {tempTotalSessions === 0 && (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                type="number"
                                                min="1"
                                                max="100"
                                                placeholder="ระบุ 1-100"
                                                className="h-11 rounded-none bg-white border-slate-200"
                                                value={tempTotalSessions || ''}
                                                onChange={(e) => setTempTotalSessions(parseInt(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-slate-500">ครั้ง</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                    * ระบบจะหักจำนวนครั้งอัตโนมัติเมื่อครูเช็คชื่อมาเรียน
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="px-6 py-4 bg-slate-50 border-t">
                            <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)} className="mr-2 h-11 rounded-none border-slate-200 bg-white">ยกเลิก</Button>
                            <Button onClick={confirmCourseSelection} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-none px-8 font-semibold shadow-sm">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                ยืนยันข้อมูล
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Manage Subjects Dialog */}
                <Dialog open={isManageSubjectsDialogOpen} onOpenChange={setIsManageSubjectsDialogOpen}>
                    <DialogContent className="sm:max-w-[500px] rounded-none border-slate-200">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold font-itim flex items-center gap-2">
                                <Settings className="h-5 w-5 text-slate-500" />
                                จัดการรายวิชา
                            </DialogTitle>
                            <DialogDescription>
                                แก้ไขชื่อวิชาหรือลบรายวิชาที่ไม่ต้องการ
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {subjects.map((subject) => (
                                        <div
                                            key={subject._id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-none border border-slate-100 group hover:border-indigo-100 hover:bg-white transition-colors"
                                        >
                                            {editingSubjectId === subject._id ? (
                                                <div className="flex-1 flex gap-2 items-center">
                                                    <Input
                                                        value={editSubjectName}
                                                        onChange={(e) => setEditSubjectName(e.target.value)}
                                                        className="h-9 text-sm"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleUpdateSubject(subject._id)}
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                        onClick={handleCancelEditSubject}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-slate-700 font-medium text-sm flex-1 truncate pr-4">
                                                        {subject.name}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                            onClick={() => handleStartEditSubject(subject)}
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteSubject(subject._id, subject.name)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        <DialogFooter>
                            <Button onClick={() => setIsManageSubjectsDialogOpen(false)} variant="outline" className="h-10 rounded-none">
                                ปิดหน้าต่าง
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Subject Dialog */}
                <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
                    <DialogContent className="sm:max-w-md rounded-none border-slate-200">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold font-itim">เพิ่มรายวิชาใหม่</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">ชื่อวิชา</Label>
                                <Input
                                    placeholder="เช่น Microbit:IOT"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                    className="h-11 rounded-none border-slate-200"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddSubjectDialogOpen(false)} className="mr-2 h-11 rounded-none border-slate-200">ยกเลิก</Button>
                            <Button onClick={handleAddSubject} className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 rounded-none px-8">บันทึก</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Calendar, Clock, BookOpen, Cpu, Wifi, BarChart3, Cat, Globe, Box, Terminal, Gamepad2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TeacherScheduleViewProps {
    students: any[];
    subjects: any[];
    user: any;
}

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

export default function TeacherScheduleView({ students, subjects, user }: TeacherScheduleViewProps) {
    const [groupedSchedule, setGroupedSchedule] = useState<any>({});
    const days = ['วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์', 'วันอาทิตย์'];

    useEffect(() => {
        processSchedule();
    }, [students, subjects]);

    // Icon Helper
    const getSubjectIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('arduino')) return <Cpu className="w-4 h-4 mr-1" />;
        if (lower.includes('iot') || lower.includes('internet')) return <Wifi className="w-4 h-4 mr-1" />;
        if (lower.includes('data') || lower.includes('science')) return <BarChart3 className="w-4 h-4 mr-1" />;
        if (lower.includes('scratch')) return <Cat className="w-4 h-4 mr-1" />;
        if (lower.includes('web') || lower.includes('html')) return <Globe className="w-4 h-4 mr-1" />;
        if (lower.includes('roblox')) return <Box className="w-4 h-4 mr-1" />;
        if (lower.includes('code') || lower.includes('python')) return <Terminal className="w-4 h-4 mr-1" />;
        if (lower.includes('microbit')) return <Cpu className="w-4 h-4 mr-1" />;
        if (lower.includes('game')) return <Gamepad2 className="w-4 h-4 mr-1" />;
        return <BookOpen className="w-4 h-4 mr-1" />;
    };

    const processSchedule = () => {
        const schedule: any = {};

        // Initialize days
        days.forEach(day => schedule[day] = []);

        students.forEach(student => {
            // Check all registered classes matches teacher's subjects
            if (student.registeredClasses && Array.isArray(student.registeredClasses)) {
                student.registeredClasses.forEach((cls: any) => {
                    // Check if this class is one of the teacher's authorized subjects
                    const isTeacherSubject = subjects.some(s => s.name === cls.className || s._id === cls.className);

                    if (isTeacherSubject) {
                        // Extract Day and Time e.g. "วันเสาร์ 10:00-12:00"
                        const timeStr = cls.classTime || '';

                        // Handle cases where time might not have day prefix clearly or format varies
                        // For now we trust strict matching, but adding trim
                        const day = days.find(d => timeStr.includes(d));

                        if (day) {
                            schedule[day].push({
                                time: timeStr,
                                subject: cls.className,
                                studentName: student.displayName,
                                studentNick: student.nickname,
                                studentClass: student.studentClass,
                                educationLevel: student.educationLevel // Start capturing educationLevel
                            });
                        }
                    }
                });
            }
        });

        // Sort by time within each day
        Object.keys(schedule).forEach(day => {
            schedule[day].sort((a: any, b: any) => {
                const timeA = a.time.split(' ')[1] || '';
                const timeB = b.time.split(' ')[1] || '';
                return timeA.localeCompare(timeB);
            });
        });

        setGroupedSchedule(schedule);
    };

    const handleExportPDF = async () => {
        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;

        const doc = new jsPDF();

        // Add Fonts if needed (skipping custom font logic for brevity, assuming standard or basic unicode support)
        // For production with Thai, we need a custom font. 
        // Since we cannot easily add files, we rely on English or basic rendering.
        // Or we use image generation. For now, let's try standard text structure.

        doc.setFontSize(18);
        doc.text(`Teaching Schedule: ${user.displayName}`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

        let finalY = 35;

        days.forEach(day => {
            const dayData = groupedSchedule[day];
            if (dayData && dayData.length > 0) {
                // Add Day Header
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                // doc.text(day, 14, finalY); // Thai might be garbled without font
                doc.text(`Day: ${day}`, 14, finalY);
                finalY += 5;

                const tableData = dayData.map((row: any) => [
                    row.time,
                    row.subject,
                    row.studentName,
                    row.studentClass || '-'
                ]);

                (autoTable as any)(doc, {
                    startY: finalY,
                    head: [['Time', 'Subject', 'Student Name', 'Class']],
                    body: tableData,
                    theme: 'grid',
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [63, 81, 181] }
                });

                finalY = (doc as any).lastAutoTable.finalY + 15;
            }
        });

        doc.save(`teaching-schedule-${user.displayName}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ตารางสอนและรายชื่อนักเรียน</h2>
                    <p className="text-slate-500">รวมรายชื่อนักเรียนแยกตามวันและเวลาเรียน</p>
                </div>
                <Button onClick={handleExportPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none">
                    <FileDown className="mr-2 h-4 w-4" />
                    ดาวน์โหลด PDF
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {days.filter(day => groupedSchedule[day]?.length > 0).map(day => (
                    <Card key={day} className="border-slate-200 shadow-sm rounded-none">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3 rounded-none">
                            <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-indigo-500" />
                                {day}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                                        <tr>
                                            <th className="p-4 w-[20%]">เวลาเรียน</th>
                                            <th className="p-4 w-[25%]">วิชา</th>
                                            <th className="p-4 w-[35%]">ชื่อนักเรียน</th>
                                            <th className="p-4 w-[20%]">ระดับชั้น</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {groupedSchedule[day].map((row: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-indigo-50/10 transition-colors">
                                                <td className="p-4 font-semibold text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-slate-400" />
                                                        {row.time.split(' ')[1] || row.time}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 rounded-none flex w-fit items-center">
                                                        {getSubjectIcon(row.subject)}
                                                        {row.subject}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium text-slate-800">{row.studentName}</div>
                                                    {row.studentNick && <div className="text-xs text-slate-400">{row.studentNick}</div>}
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    {EDUCATION_LEVELS[row.educationLevel] || row.educationLevel || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {Object.values(groupedSchedule).every((arr: any) => arr.length === 0) && (
                    <div className="text-center py-20 bg-white border border-dashed border-slate-300 rounded-none">
                        <User className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">ไม่พบข้อมูลการลงทะเบียนเรียนในรายวิชาของคุณ</p>
                    </div>
                )}
            </div>
        </div>
    );
}

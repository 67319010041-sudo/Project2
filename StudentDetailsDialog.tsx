import { useState, useEffect, Fragment, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { User, Save, Loader2, GraduationCap, FileText, BarChart3, Clock, MessageSquare, Check, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Textarea } from '@/components/ui/input'; // Removed invalid import
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CertificateTemplate from './CertificateTemplate';

interface StudentDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    student: any;
    subject: any;
    teacher: any;
}

const SKILL_STRUCTURE = [
    {
        category: 'ด้านองค์ความรู้ (Knowledge)',
        items: [
            { id: 'k_exercise', label: 'แบบฝึกหัด', max: 5 }
        ]
    },
    {
        category: 'ด้านการปฏิบัติ (Action/Skill)',
        items: [
            { id: 's_creative', label: 'ความคิดสร้างสรรค์ (Creative Thinking)', max: 5 },
            { id: 's_planning', label: 'วางแผนการทำงาน (Planning & Time Management)', max: 5 },
            { id: 's_problem_solving', label: 'การแก้ปัญหา (Problem Solving)', max: 5 },
            { id: 's_design_improve', label: 'ปรับปรุงการออกแบบ (Improve of Design)', max: 5 },
            { id: 's_programming', label: 'ทักษะการเขียนโปรแกรม (Programming)', max: 5 },
            { id: 's_present', label: 'นำเสนอผลงาน (Present)', max: 5 },
            { id: 's_emotional', label: 'ทักษะทางอารมณ์/สมาธิ/ความขยัน', max: 5 }
        ]
    }
];

export default function StudentDetailsDialog({ isOpen, onClose, student, subject, teacher }: StudentDetailsDialogProps) {
    const [activeTab, setActiveTab] = useState('profile');
    const [scores, setScores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // PDF State
    // PDF State
    const reportRef = useRef<HTMLDivElement>(null);
    const certificateRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);
    const [downloadingCert, setDownloadingCert] = useState(false);

    const [finalGradeInfo, setFinalGradeInfo] = useState<{ score: number, grade: string, term: number } | null>(null);

    // Multi-Term Support
    const [allTerms, setAllTerms] = useState<any[]>([]);
    const [viewingTerm, setViewingTerm] = useState<number>(1);
    const [isEditing, setIsEditing] = useState(false);

    // Evaluation State: { period_number: { criteria_id: score } }
    const [evaluations, setEvaluations] = useState<Record<number, Record<string, number>>>({});
    const [comments, setComments] = useState<Record<number, string>>({});
    const [dates, setDates] = useState<Record<number, string>>({}); // ISO String
    const [savingEval, setSavingEval] = useState(false);

    const [newScore, setNewScore] = useState({
        title: '',
        score: '',
        maxScore: '20'
    });

    // Attendance State
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [attendanceStats, setAttendanceStats] = useState({ present: 0, late: 0, leave: 0, absent: 0 });


    const fetchGrades = async () => {
        if (!student || !subject) return;
        setLoading(true);
        try {
            const token = await teacher.getIdToken();
            const res = await fetch(API_ENDPOINTS.GRADES.STUDENT(student._id), {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Filter by Subject ID or Name AND pick the one with highest term
                // Filter by Subject ID or Name
                const subjectGrades = data.filter((g: any) => g.subjectId === subject._id || g.subjectName === subject.name)
                    .sort((a: any, b: any) => (a.term || 1) - (b.term || 1)); // Sort Ascending 1, 2, 3...

                setAllTerms(subjectGrades);

                // Default to latest term if not set, or keep current viewing term if exists
                let targetGrade = subjectGrades[subjectGrades.length - 1]; // Default to latest
                if (viewingTerm) {
                    const found = subjectGrades.find((g: any) => g.term === viewingTerm);
                    if (found) targetGrade = found;
                    else setViewingTerm(targetGrade?.term || 1);
                } else {
                    setViewingTerm(targetGrade?.term || 1);
                }

                if (targetGrade) {
                    setScores(targetGrade.scores || []);
                    setCurrentGradeId(targetGrade._id);
                    setIsCourseComplete(targetGrade.isComplete || (targetGrade.evaluations && targetGrade.evaluations.length >= 12));

                    if (targetGrade.isComplete || targetGrade.finalGrade) {
                        setFinalGradeInfo({
                            score: targetGrade.finalScore || 0,
                            grade: targetGrade.finalGrade || '-',
                            term: targetGrade.term || 1
                        });
                    } else {
                        setFinalGradeInfo(null);
                    }

                    // Parse evaluations
                    const evalMap: Record<number, Record<string, number>> = {};
                    const commentMap: Record<number, string> = {};
                    const dateMap: Record<number, string> = {};

                    if (targetGrade.evaluations && Array.isArray(targetGrade.evaluations)) {
                        targetGrade.evaluations.forEach((e: any) => {
                            evalMap[e.period] = e.scores || {};
                            if (e.comment) commentMap[e.period] = e.comment;
                            if (e.date) dateMap[e.period] = e.date;
                        });
                    }
                    setEvaluations(evalMap);
                    setComments(commentMap);
                    setDates(dateMap);
                } else {
                    setAllTerms([]);
                    setScores([]);
                    setCurrentGradeId(null);
                    setIsCourseComplete(false);
                    setFinalGradeInfo(null);
                    setEvaluations({});
                    setComments({});
                    setDates({});
                }
            }
        } catch (error) {
            console.error('Error fetching grades:', error);
            toast.error('ไม่สามารถดึงข้อมูลคะแนนได้');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async () => {
        if (!student || !subject) return;
        try {
            const token = await teacher.getIdToken();
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/all?subjectId=${subject._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const studentHistory: any[] = [];
                let stats = { present: 0, late: 0, leave: 0, absent: 0 };

                data.forEach((record: any) => {
                    const studentRecord = record.students.find((s: any) => {
                        const sId = typeof s.studentId === 'object' ? s.studentId._id : s.studentId;
                        return sId === student._id;
                    });

                    if (studentRecord) {
                        studentHistory.push({
                            date: record.date,
                            status: studentRecord.status,
                            remark: studentRecord.remark || studentRecord.comment
                        });

                        if (studentRecord.status === 'Present') stats.present++;
                        else if (studentRecord.status === 'Late') stats.late++;
                        else if (studentRecord.status === 'Leave') stats.leave++;
                        else if (studentRecord.status === 'Absent') stats.absent++;
                    }
                });

                // Sort by date descending
                setAttendanceHistory(studentHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setAttendanceStats(stats);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Report_${student.displayName || 'Student'}_${subject.name}.pdf`);
            toast.success('ดาวน์โหลดผลการประเมินสำเร็จ');
        } catch (error) {
            console.error('PDF Error', error);
            toast.error('เกิดข้อผิดพลาดในการสร้าง PDF');
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadCertificate = async () => {
        if (!certificateRef.current) return;
        setDownloadingCert(true);
        try {
            const canvas = await html2canvas(certificateRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            // A4 Landscape
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const levelName = allTerms.find(g => g._id === currentGradeId)?.currentLevel || 'Completion';
            pdf.save(`Certificate_${student.displayName}_${levelName}.pdf`);
            toast.success('ดาวน์โหลดใบประกาศนียบัตรสำเร็จ');
        } catch (error) {
            console.error('Certificate Error', error);
            toast.error('เกิดข้อผิดพลาดในการสร้างใบประกาศนียบัตร');
        } finally {
            setDownloadingCert(false);
        }
    };

    const getLevelName = (termIndex: number) => {
        const grade = allTerms.find(g => g.term === termIndex);
        return grade?.currentLevel || `Term ${termIndex}`;
    };

    useEffect(() => {
        if (isOpen && student && subject) {
            setViewingTerm(0); // Reset to auto-select latest
            setIsEditing(false); // Reset edit mode
            fetchGrades();
            fetchAttendance();
        }
    }, [isOpen, student, subject]);

    // When viewing term changes, re-run logic from local state (or re-fetch simpler)
    useEffect(() => {
        if (!isOpen || allTerms.length === 0) return;

        const targetGrade = allTerms.find(g => g.term === viewingTerm);
        if (targetGrade) {
            setScores(targetGrade.scores || []);
            setCurrentGradeId(targetGrade._id);
            setIsCourseComplete(targetGrade.isComplete || (targetGrade.evaluations && targetGrade.evaluations.length >= 12));
            // Reset edit mode when switching terms
            setIsEditing(false);

            if (targetGrade.isComplete || targetGrade.finalGrade) {
                setFinalGradeInfo({
                    score: targetGrade.finalScore || 0,
                    grade: targetGrade.finalGrade || '-',
                    term: targetGrade.term || 1
                });
            } else {
                setFinalGradeInfo(null);
            }

            const evalMap: Record<number, Record<string, number>> = {};
            const commentMap: Record<number, string> = {};
            const dateMap: Record<number, string> = {};

            if (targetGrade.evaluations && Array.isArray(targetGrade.evaluations)) {
                targetGrade.evaluations.forEach((e: any) => {
                    evalMap[e.period] = e.scores || {};
                    if (e.comment) commentMap[e.period] = e.comment;
                    if (e.date) dateMap[e.period] = e.date;
                });
            }
            setEvaluations(evalMap);
            setComments(commentMap);
            setDates(dateMap);
        }
    }, [viewingTerm, allTerms]);

    const handleEvaluationChange = (period: number, criteriaId: string, value: number) => {
        setEvaluations(prev => ({
            ...prev,
            [period]: {
                ...(prev[period] || {}),
                [criteriaId]: value
            }
        }));
    };

    const handleCommentChange = (period: number, value: string) => {
        setComments(prev => ({
            ...prev,
            [period]: value
        }));
    };

    const saveEvaluation = async (periodNum: number, currentScores: any, commentStr?: string, dateStr?: string) => {
        if (!student || !subject) return;

        try {
            const token = await teacher.getIdToken();
            await fetch(API_ENDPOINTS.GRADES.UPDATE_EVALUATION, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: student._id,
                    subjectId: subject._id,
                    subjectName: subject.name,
                    period: periodNum,
                    scores: currentScores,
                    comment: commentStr || '',
                    date: dateStr
                })
            });

            // Update local state without full reload
            setEvaluations(prev => ({
                ...prev,
                [periodNum]: currentScores
            }));

            if (commentStr !== undefined) {
                setComments(prev => ({
                    ...prev,
                    [periodNum]: commentStr
                }));
            }

            if (dateStr !== undefined) {
                setDates(prev => ({
                    ...prev,
                    [periodNum]: dateStr
                }));
            }

        } catch (error) {
            console.error('Failed to save evaluation', error);
        }
    };

    const handleSaveEvaluation = async () => {
        setSavingEval(true);
        try {
            const token = await teacher.getIdToken();

            // Loop through periods 1-12 and save
            const promises = [];
            for (let i = 1; i <= 12; i++) {
                const periodScores = evaluations[i];
                const periodComment = comments[i];

                // Save if there are scores OR a comment
                if (periodScores || periodComment) {
                    promises.push(fetch(API_ENDPOINTS.GRADES.UPDATE_EVALUATION, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            studentId: student._id,
                            subjectId: subject._id,
                            subjectName: subject.name, // Ensure subjectName is sent
                            period: i,
                            scores: periodScores || {},
                            comment: periodComment || ''
                        })
                    }));
                }
            }

            await Promise.all(promises);
            toast.success('บันทึกผลการประเมินสำเร็จ');
            fetchGrades(); // Refresh
        } catch (error) {
            console.error('Save eval error:', error);
            toast.error('บันทึกไม่สำเร็จ');
        } finally {
            setSavingEval(false);
        }
    };

    const handleAddScore = async () => {
        if (!newScore.title || !newScore.score || !newScore.maxScore) return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
        setSaving(true);
        try {
            const token = await teacher.getIdToken();
            const formData = new FormData();
            formData.append('studentId', student._id);
            formData.append('subjectId', subject._id);
            formData.append('subjectName', subject.name);

            const scoreItem = {
                title: newScore.title,
                score: Number(newScore.score),
                maxScore: Number(newScore.maxScore),
                type: 'exam',
                timestamp: new Date().toISOString()
            };
            formData.append('scoreItem', JSON.stringify(scoreItem));

            const res = await fetch(API_ENDPOINTS.GRADES.ADD_SCORE, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                toast.success('บันทึกคะแนนสอบสำเร็จ');
                setNewScore({ title: '', score: '', maxScore: '20' });
                fetchGrades();
            } else {
                toast.error('เกิดข้อผิดพลาดในการบันทึก');
            }

        } catch {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setSaving(false);
        }
    };

    const handleNextTerm = async () => {
        if (!student || !subject) return;
        setLoading(true);
        try {
            const token = await teacher.getIdToken();
            const subjectGrade = scores.length > 0 ? (scores[0] as any)._id : null; // This logic is bit off, need grade ID
            // Actually fetchGrades sets scores = subjectGrade.scores. 
            // We need the grade document ID.
            // Let's re-fetch or store gradeId in state. 
        } catch (error) {
            console.error(error);
        }
    };

    // Correct Logic: Store gradeId when fetching
    const [currentGradeId, setCurrentGradeId] = useState<string | null>(null);
    const [isCourseComplete, setIsCourseComplete] = useState(false);

    // ... inside fetchGrades ...
    // if (subjectGrade) {
    //    setCurrentGradeId(subjectGrade._id);
    //    setIsCourseComplete(subjectGrade.isComplete || subjectGrade.evaluations?.length >= 12);
    // ...

    const triggerNextTerm = async () => {
        if (!currentGradeId) return;
        setLoading(true);
        try {
            const token = await teacher.getIdToken();
            const res = await fetch(`${API_ENDPOINTS.GRADES.BASE}/${currentGradeId}/next-term`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('สร้างแบบประเมินสำหรับเทอมถัดไปเรียบร้อยแล้ว');
                onClose(); // Close to refresh teacher dashboard list or reload
            } else {
                const err = await res.json();
                toast.error(err.message || 'ไม่สามารถสร้างเทอมถัดไปได้');
            }
        } catch (error) {
            console.error(error);
            toast.error('เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // Helper to calculate total score for a period column
    const calculatePeriodTotal = (periodNum: number) => {
        const periodData = evaluations[periodNum];
        if (!periodData) return 0;
        return Object.values(periodData).reduce((sum, val) => sum + (Number(val) || 0), 0);
    };

    // Calculate Grand Total for Row
    const calculateRowTotal = (itemId: string) => {
        let total = 0;
        for (let i = 1; i <= 12; i++) {
            const val = evaluations[i]?.[itemId];
            if (val) total += Number(val);
        }
        return total;
    };


    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* Full Screen Modal */}
            <DialogContent className="max-w-[100vw] w-screen h-screen flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 rounded-none border-0" aria-describedby={undefined}>
                <DialogTitle className="sr-only">Student Details</DialogTitle>
                <DialogDescription className="sr-only">Detailed view of student scores and evaluations</DialogDescription>

                {/* Header Section */}
                <div className="px-6 py-4 border-b bg-indigo-600 flex items-center justify-between shadow-md z-30">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-indigo-700 rounded-full h-10 w-10">
                            <X className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/20 bg-indigo-500">
                                {student.photoURL ?
                                    <img src={student.photoURL} className="h-full w-full object-cover" alt="Student" /> :
                                    <User className="h-6 w-6 text-indigo-200 m-auto mt-1.5" />
                                }
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight">
                                    {student.displayName || student.studentName}
                                </h2>
                                <p className="text-indigo-100 text-xs flex items-center gap-2">
                                    <span>{student.studentClass || "ไม่ระบุชั้น"}</span>
                                    <span>•</span>
                                    <span>{subject.name}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Term Selector */}
                        {allTerms.length > 0 && (
                            <div className="flex bg-indigo-700/50 rounded-lg p-1 mr-4">
                                {allTerms.map((t) => (
                                    <button
                                        key={t.term}
                                        onClick={() => setViewingTerm(t.term || 1)}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewingTerm === (t.term || 1)
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-indigo-100 hover:bg-white/10'}`}
                                    >
                                        Term {t.term || 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            {/* Course Completion Alert & Button */}
                            {isCourseComplete && (
                                <div className="flex items-center gap-2 mr-2">
                                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                        <Check className="w-3 h-3" />
                                        Completed (Term {viewingTerm})
                                    </span>

                                    {/* Edit Toggle for Completed Courses */}
                                    {!isEditing ? (
                                        <Button
                                            onClick={() => setIsEditing(true)}
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 text-xs bg-white/20 text-white hover:bg-white/30 border-none"
                                        >
                                            แก้ไข (Edit)
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => setIsEditing(false)}
                                            variant="destructive"
                                            size="sm"
                                            className="h-7 text-xs"
                                        >
                                            ปิดการแก้ไข
                                        </Button>
                                    )}

                                    <Button
                                        onClick={handleDownloadPDF}
                                        variant="outline"
                                        size="sm"
                                        disabled={downloading}
                                        className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 mr-2"
                                    >
                                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                                        PDF
                                    </Button>

                                    {/* Show Next Term button ONLY if looking at the latest completed term */}
                                    {viewingTerm === Math.max(...allTerms.map(t => t.term || 1)) && (
                                        <Button
                                            onClick={triggerNextTerm}
                                            size="sm"
                                            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold border-0 shadow-lg animate-pulse"
                                        >
                                            <GraduationCap className="w-4 h-4 mr-1" />
                                            เริ่ม Term {viewingTerm + 1}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {activeTab === 'evaluation' && (
                                <Button
                                    onClick={handleSaveEvaluation}
                                    disabled={savingEval}
                                    className="bg-white text-indigo-600 hover:bg-indigo-50 border-0 font-semibold shadow-lg"
                                >
                                    {savingEval ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    บันทึกผลการประเมิน
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    <div className="px-6 pt-2 bg-white border-b shadow-sm z-20">
                        <TabsList className="bg-transparent space-x-6 h-auto p-0">
                            <TabsTrigger value="profile" className="px-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-medium text-slate-500">
                                ประวัติส่วนตัว
                            </TabsTrigger>
                            <TabsTrigger value="exam" className="px-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-medium text-slate-500">
                                คะแนนสอบ (Exam)
                            </TabsTrigger>
                            <TabsTrigger value="evaluation" className="px-2 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 font-medium text-slate-500">
                                การประเมิน (Evaluation)
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-0">

                            {/* ============== TAB : PROFILE ============== */}
                            <TabsContent value="profile" className="focus-visible:ring-0 p-6 max-w-5xl mx-auto">
                                <Card className="border-slate-200 shadow-sm rounded-none">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <User className="w-5 h-5 text-indigo-600" />
                                            ข้อมูลผู้เรียน
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-1 md:col-span-2">
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider">ชื่อ-นามสกุล</Label>
                                                <div className="font-medium text-slate-900 border-b pb-2">{student.studentName || student.displayName || '-'}</div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider">ระดับการศึกษา (Education Level)</Label>
                                                <div className="font-medium text-slate-900 border-b pb-2">
                                                    {student.educationLevel || student.grade || '-'}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider">วิชาที่เรียน (Subject)</Label>
                                                <div className="font-medium text-indigo-600 border-b pb-2">
                                                    {subject.name}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider">วันที่เริ่มเรียน (Start Date)</Label>
                                                <div className="font-medium text-slate-900 border-b pb-2">
                                                    {(() => {
                                                        const reg = student.registeredCourses?.find((c: any) => c.subject === subject.name || c.subject === subject._id);
                                                        return reg?.startDate ? format(new Date(reg.startDate), 'dd MMMM yyyy', { locale: th }) : '-';
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider">วัน-เวลาเรียน (Class Schedule)</Label>
                                                <div className="font-medium text-slate-900 border-b pb-2">
                                                    {(() => {
                                                        const reg = student.registeredCourses?.find((c: any) => c.subject === subject.name || c.subject === subject._id);
                                                        return reg ? `${reg.day || '-'} (${reg.time || '-'})` : '-';
                                                    })()}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider">จำนวนครั้งที่ประเมิน (Evaluations)</Label>
                                                <div className="font-medium text-slate-900 border-b pb-2">
                                                    {Object.keys(evaluations).length} ครั้ง
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8">
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b pb-2">ประวัติการเข้าเรียน (Attendance History)</h3>
                                            <div className="bg-slate-50 border border-slate-200 rounded-none overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-100 border-b border-slate-200 hover:bg-slate-100">
                                                            <TableHead className="font-bold text-slate-600 w-1/3">วันที่ (Date)</TableHead>
                                                            <TableHead className="font-bold text-slate-600 text-center w-1/3">สถานะ (Status)</TableHead>
                                                            <TableHead className="font-bold text-slate-600 w-1/3">หมายเหตุ (Remark)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {attendanceHistory.length > 0 ? (
                                                            attendanceHistory.map((record, index) => (
                                                                <TableRow key={index} className="border-b border-slate-100 hover:bg-white text-xs">
                                                                    <TableCell className="font-medium text-slate-700">
                                                                        {format(new Date(record.date), 'dd/MM/yyyy', { locale: th })}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase
                                                                            ${record.status === 'Present' ? 'bg-green-100 text-green-700' :
                                                                                record.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                                                                                    record.status === 'Leave' ? 'bg-blue-100 text-blue-700' :
                                                                                        'bg-red-100 text-red-700'}`}>
                                                                            {record.status === 'Present' ? 'มา' :
                                                                                record.status === 'Late' ? 'สาย' :
                                                                                    record.status === 'Leave' ? 'ลา' : 'ขาด'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-slate-500">
                                                                        {record.remark || '-'}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={3} className="text-center py-6 text-slate-400 italic">
                                                                    ไม่มีข้อมูลการเข้าเรียน
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-slate-500 text-xs uppercase tracking-wider">ประวัติวันที่เข้าเรียน / ประเมิน (Attended Dates)</Label>
                                            <div className="font-medium text-slate-900 border-b pb-2">
                                                {Object.values(dates).length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {Object.values(dates).sort().map((d: string, i: number) => (
                                                            <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                                                                {format(new Date(d), 'd MMM yyyy', { locale: th })}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm flex items-center gap-2">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        ยังไม่มีข้อมูลการเข้าเรียน
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* ============== TAB : EXAM SCORES ============== */}
                            <TabsContent value="exam" className="focus-visible:ring-0 p-6 max-w-7xl mx-auto">
                                <div className="grid lg:grid-cols-3 gap-6">
                                    {/* Score Input Card */}
                                    <Card className="border-slate-200 shadow-sm lg:col-span-1 h-fit rounded-none">
                                        <CardHeader className="bg-slate-50 border-b pb-4">
                                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-indigo-600" />
                                                เพิ่มคะแนนสอบ
                                            </CardTitle>
                                            <CardDescription>กรอกคะแนนสอบใหม่</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-5">
                                            <div className="space-y-2">
                                                <Label className="text-slate-700">ชื่อการสอบ</Label>
                                                <Input
                                                    placeholder="เช่น สอบกลางภาค..."
                                                    value={newScore.title}
                                                    onChange={e => setNewScore({ ...newScore, title: e.target.value })}
                                                    className="rounded-none border-slate-300"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">คะแนน</Label>
                                                    <Input
                                                        type="number"
                                                        value={newScore.score}
                                                        onChange={e => setNewScore({ ...newScore, score: e.target.value })}
                                                        className="rounded-none border-slate-300"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">เต็ม</Label>
                                                    <Input
                                                        type="number"
                                                        value={newScore.maxScore}
                                                        onChange={e => setNewScore({ ...newScore, maxScore: e.target.value })}
                                                        className="rounded-none border-slate-300"
                                                    />
                                                </div>
                                            </div>
                                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-none shadow-sm" onClick={handleAddScore} disabled={saving}>
                                                {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                                                บันทึก
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    {/* History Table */}
                                    <Card className="border-slate-200 shadow-sm lg:col-span-2 rounded-none">
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-base font-semibold">ประวัติคะแนนสอบ</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>วันที่</TableHead>
                                                        <TableHead>รายการ</TableHead>
                                                        <TableHead className="text-right">คะแนน</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {scores.slice().reverse().filter((s: any) => s.type === 'exam' || !s.type).map((score: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="text-xs text-slate-500">
                                                                {score.date ? new Date(score.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-'}
                                                            </TableCell>
                                                            <TableCell className="font-medium text-slate-800">{score.title}</TableCell>
                                                            <TableCell className="text-right font-mono">
                                                                <span className="font-bold text-indigo-600">{score.score}</span>
                                                                <span className="text-slate-400 text-xs"> / {score.maxScore}</span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {scores.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center py-6 text-slate-400">
                                                                ยังไม่มีคะแนนสอบ
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* ============== TAB : EVALUATION (TABLE) ============== */}
                            <TabsContent value="evaluation" className="mt-0 focus-visible:ring-0 p-4">
                                <div className="border border-slate-300 bg-white shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto relative">
                                        <Table className="border-collapse border-slate-300 w-max min-w-full">
                                            <TableHeader className="sticky top-0 z-20 shadow-sm bg-slate-100">
                                                <TableRow className="border-b border-slate-300">
                                                    <TableHead className="w-[280px] min-w-[280px] sticky left-0 bg-slate-100 z-30 border-r border-slate-300 py-3 pl-4">
                                                        <div className="font-bold text-slate-900 text-sm">หัวข้อการประเมิน</div>
                                                    </TableHead>
                                                    <TableHead className="w-[50px] text-center border-r border-slate-300 bg-yellow-50/80 px-1">
                                                        <div className="font-bold text-slate-900 text-xs">Max</div>
                                                    </TableHead>
                                                    {Array.from({ length: 12 }).map((_, i) => (
                                                        <TableHead key={i} className="w-[60px] min-w-[60px] text-center border-r border-slate-300 bg-white px-0">
                                                            <div className="flex flex-col items-center justify-center py-1">
                                                                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">คาบที่ {i + 1}</span>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            className="h-auto p-1 hover:bg-slate-100 flex flex-col gap-0.5"
                                                                            disabled={isCourseComplete && !isEditing}
                                                                        >
                                                                            {dates[i + 1] ? (
                                                                                <span className="font-bold text-indigo-600 text-[10px] leading-tight">
                                                                                    {format(new Date(dates[i + 1]), 'd/MM', { locale: th })}
                                                                                </span>
                                                                            ) : (
                                                                                <CalendarIcon className="w-4 h-4 text-slate-300" />
                                                                            )}
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-4 bg-white" align="center">
                                                                        <div className="flex flex-col gap-2">
                                                                            <Label className="text-xs font-bold text-slate-700">วันที่ทำการประเมิน</Label>
                                                                            <input
                                                                                type="date"
                                                                                className="border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                                value={dates[i + 1] ? new Date(dates[i + 1]).toISOString().split('T')[0] : ''}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (val) {
                                                                                        const dateObj = new Date(val);
                                                                                        saveEvaluation(i + 1, evaluations[i + 1] || {}, comments[i + 1] || '', dateObj.toISOString());
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                                    <TableHead className="w-[60px] text-center bg-slate-100 z-20 sticky right-0 border-l border-slate-300">
                                                        <div className="font-bold text-slate-900">รวม</div>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {SKILL_STRUCTURE.map((group) => (
                                                    <Fragment key={group.category}>
                                                        <TableRow className="bg-indigo-50/50 hover:bg-indigo-100/50 border-b border-slate-300">
                                                            <TableCell colSpan={15} className="font-semibold text-indigo-700 py-2 px-4 sticky left-0 z-10 bg-indigo-50/50 border-r border-slate-300">
                                                                {group.category}
                                                            </TableCell>
                                                        </TableRow>
                                                        {group.items.map((item) => {
                                                            const rowTotal = calculateRowTotal(item.id);
                                                            return (
                                                                <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-300">
                                                                    <TableCell className="font-medium text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-300 py-2 pl-4 text-sm">
                                                                        {item.label}
                                                                    </TableCell>
                                                                    <TableCell className="text-center font-mono text-slate-500 border-r border-slate-300 bg-yellow-50/20 text-xs">
                                                                        {item.max}
                                                                    </TableCell>
                                                                    {Array.from({ length: 12 }).map((_, periodIdx) => {
                                                                        const periodNum = periodIdx + 1;
                                                                        const scoreVal = evaluations[periodNum]?.[item.id];
                                                                        const displayVal = scoreVal !== undefined ? scoreVal : '';

                                                                        return (
                                                                            <TableCell key={periodNum} className="p-0 border-r border-slate-300 text-center relative group">
                                                                                <Popover>
                                                                                    <PopoverTrigger asChild>
                                                                                        <div className="w-full h-10 flex items-center justify-center cursor-pointer hover:bg-indigo-50 transition-colors font-mono font-medium text-slate-900">
                                                                                            {displayVal}
                                                                                        </div>
                                                                                    </PopoverTrigger>
                                                                                    <PopoverContent className="w-[180px] p-2 bg-white shadow-xl border-slate-200" align="center">
                                                                                        <div className="grid grid-cols-5 gap-1">
                                                                                            {[1, 2, 3, 4, 5].map((val) => (
                                                                                                <button
                                                                                                    key={val}
                                                                                                    disabled={isCourseComplete && !isEditing}
                                                                                                    onClick={() => handleEvaluationChange(periodNum, item.id, val)}
                                                                                                    className={`h-8 rounded flex items-center justify-center text-sm font-bold transition-all ${scoreVal === val
                                                                                                        ? 'bg-indigo-600 text-white shadow-md'
                                                                                                        : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600'
                                                                                                        }`}
                                                                                                >
                                                                                                    {val}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                        <div className="mt-2 text-center">
                                                                                            <button
                                                                                                onClick={() => handleEvaluationChange(periodNum, item.id, 0)}
                                                                                                className="text-xs text-red-500 hover:underline"
                                                                                            >
                                                                                                ลบคะแนน
                                                                                            </button>
                                                                                        </div>
                                                                                        {evaluations[periodNum] && Object.keys(evaluations[periodNum]).length > 0 && (
                                                                                            <div className="mt-3 pt-2 text-xs text-slate-400 border-t border-slate-100">
                                                                                                บันทึกคะแนนอัตโนมัติ
                                                                                            </div>
                                                                                        )}
                                                                                    </PopoverContent>
                                                                                </Popover>
                                                                            </TableCell>
                                                                        );
                                                                    })}
                                                                    <TableCell className="text-center font-bold text-slate-800 bg-slate-50 sticky right-0 z-10 border-l border-slate-300">
                                                                        {rowTotal}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </Fragment>
                                                ))}

                                                {/* Total Score per Period Row */}
                                                <TableRow className="bg-slate-100 border-t-2 border-slate-300">
                                                    <TableCell className="font-bold text-right text-slate-700 sticky left-0 bg-slate-100 z-10 border-r border-slate-300 pr-4">
                                                        รวมคะแนนประจำคาบ
                                                    </TableCell>
                                                    <TableCell className="border-r border-slate-300"></TableCell>
                                                    {Array.from({ length: 12 }).map((_, i) => {
                                                        const total = calculatePeriodTotal(i + 1);
                                                        return (
                                                            <TableCell key={i} className="text-center font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-300">
                                                                {total > 0 ? total : '-'}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="bg-slate-200 sticky right-0"></TableCell>
                                                </TableRow>

                                                {/* Feedback / Comments Row */}
                                                <TableRow className="bg-white border-t border-slate-300">
                                                    <TableCell className="font-bold text-right text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-300 pr-4 align-top py-3">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <MessageSquare className="w-4 h-4" />
                                                            ติชมนักเรียน (Feedback)
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="border-r border-slate-300"></TableCell>
                                                    {Array.from({ length: 12 }).map((_, i) => {
                                                        const periodNum = i + 1;
                                                        const comment = comments[periodNum] || '';

                                                        return (
                                                            <TableCell key={i} className="text-center border-r border-slate-300 p-1 align-top relative h-[60px]">
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <div className={`w-full h-full min-h-[50px] rounded cursor-pointer border flex flex-col items-center justify-center gap-1 transition-all ${comment
                                                                            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                                                            : 'bg-slate-50 border-dashed border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400'
                                                                            }`}>
                                                                            {comment ? (
                                                                                <>
                                                                                    <MessageSquare className="w-4 h-4" />
                                                                                    <span className="text-[10px] truncate max-w-[50px]">มีข้อความ</span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-[10px]">+ ติชม</span>
                                                                            )}
                                                                        </div>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-[300px] p-4 bg-white shadow-xl border-slate-200" align="center" onPointerDownOutside={(e) => { if ((isCourseComplete && !isEditing)) e.preventDefault() }}>
                                                                        {isCourseComplete && !isEditing ? (
                                                                            <div className="text-center text-red-500 text-sm font-bold">โหมดดูอย่างเดียว (Read Only)</div>
                                                                        ) : (
                                                                            <div className="space-y-3">
                                                                                <h4 className="font-medium text-sm flex items-center gap-2">
                                                                                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                                                                                    ความคิดเห็น - คาบที่ {periodNum}
                                                                                </h4>
                                                                                <textarea
                                                                                    className="w-full h-[100px] p-3 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-indigo-100 outline-none border-slate-200 bg-white text-slate-900"
                                                                                    placeholder="เขียนคำติชมถึงนักเรียน..."
                                                                                    value={comment}
                                                                                    onChange={(e) => handleCommentChange(periodNum, e.target.value)}
                                                                                />
                                                                                <div className="flex justify-end">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                                                                                    >
                                                                                        บันทึก (Save)
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="bg-slate-200 sticky right-0"></TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>

                {/* Hidden Report Template (Rendered only when needed) */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    {finalGradeInfo ? (
                        <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-white p-12 font-sans text-slate-900 relative flex flex-col items-center">
                            {/* Font Loader */}
                            <style>
                                {`
                                    @import url('https://fonts.googleapis.com/css2?family=Sawasdee:wght@400;700&display=swap');
                                    .font-sawasdee {
                                        font-family: 'Sawasdee', sans-serif;
                                    }
                                `}
                            </style>

                            {/* Header / Logo */}
                            <div className="w-full flex flex-col items-center justify-center mb-8 font-sawasdee">
                                <img src="/school-logo.png" alt="School Logo" className="h-24 mb-4 object-contain" onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }} />
                                <h1 className="text-3xl font-bold text-slate-900 text-center">ใบรายงานผลการเรียน</h1>
                                <h2 className="text-xl font-bold text-slate-700 text-center mt-1">สถาบันกวดวิชา EQ Science Learning Center</h2>
                                <p className="text-sm text-slate-500 mt-2">12/34 ถนนสุขุมวิท ตำบลเนินพระ อำเภอเมืองระยอง จังหวัดระยอง 21000</p>
                            </div>

                            <div className="w-full h-0.5 bg-slate-800 mb-8"></div>

                            {/* Student Info */}
                            <div className="w-full grid grid-cols-2 gap-8 mb-8 font-sawasdee">
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-600 min-w-[100px]">ชื่อ-นามสกุล:</span>
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{student.displayName || student.studentName || 'ไม่ระบุชื่อ'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-600 min-w-[100px]">รหัสนักเรียน:</span>
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{student.studentId || student.username || '-'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-600 min-w-[80px]">วิชา:</span>
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{subject.name}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-600 min-w-[80px]">วันที่:</span>
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{format(new Date(), 'd MMMM yyyy', { locale: th })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Grade Display */}
                            <div className="w-full border-2 border-slate-800 rounded-lg p-8 mb-8 flex flex-col items-center justify-center bg-slate-50 font-sawasdee">
                                <p className="text-xl font-bold text-slate-700 mb-4">ผลการประเมินตลอดหลักสูตร (Term {finalGradeInfo.term})</p>
                                <div className="flex items-center gap-12">
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-500 mb-1">คะแนนรวม</p>
                                        <p className="text-4xl font-bold text-slate-900">{finalGradeInfo.score}</p>
                                        <p className="text-xs text-slate-400">(เต็ม 100)</p>
                                    </div>
                                    <div className="h-16 w-0.5 bg-slate-300"></div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-500 mb-1">ระดับคะแนน</p>
                                        <div className="text-6xl font-bold text-slate-900 leading-none">
                                            {finalGradeInfo.grade}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Criteria Table Summary */}
                            <div className="w-full mb-12 font-sawasdee">
                                <h3 className="font-bold text-lg mb-2 border-b border-slate-300 pb-1">รายละเอียดการประเมิน (Evaluation Details)</h3>
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="border border-slate-300 p-2 text-left">หมวดหมู่ (Category)</th>
                                            <th className="border border-slate-300 p-2 text-center w-24">ผลประเมิน</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SKILL_STRUCTURE.map((group) => (
                                            <tr key={group.category}>
                                                <td className="border border-slate-300 p-2 font-bold">{group.category}</td>
                                                <td className="border border-slate-300 p-2 text-center">ผ่านเกณฑ์</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Signatures */}
                            <div className="w-full grid grid-cols-2 gap-20 mt-auto font-sawasdee">
                                <div className="flex flex-col items-center">
                                    <div className="h-20 w-full"></div>
                                    <div className="w-full border-t border-dotted border-slate-800 my-2"></div>
                                    <p className="font-bold">({student.displayName || student.studentName || '...................................'})</p>
                                    <p className="text-sm text-slate-500">นักเรียน (Student)</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="h-20 w-fit"></div>
                                    <div className="w-full border-t border-dotted border-slate-800 my-2"></div>
                                    <p className="font-bold">({teacher.displayName || 'นายครู ผู้สอน'})</p>
                                    <p className="text-sm text-slate-500">ครูผู้สอน (Instructor)</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="w-full text-center text-xs text-slate-400 mt-8 font-sawasdee">
                                <p>เอกสารฉบับนี้ออกโดยระบบอัตโนมัติของ EQ Science Learning Center</p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Hidden Certificate Template for PDF Generation */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <CertificateTemplate
                        ref={certificateRef}
                        studentName={student?.studentName || student?.displayName || 'Student'}
                        courseName={subject?.name || 'Course'}
                        level={allTerms.find(g => g._id === currentGradeId)?.currentLevel || '-'}
                        completionDate={new Date()}
                        score={Math.round(finalGradeInfo?.score || 0)}
                        grade={finalGradeInfo?.grade || '-'}
                    />
                </div>

            </DialogContent>
        </Dialog>
    );
}

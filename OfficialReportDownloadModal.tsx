import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, CheckCircle, FileText, BarChart3, ChevronRight, X, AlertCircle, BookOpen } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface OfficialReportDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    grades: any[];
    studentName: string;
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

export default function OfficialReportDownloadModal({ isOpen, onClose, grades, studentName }: OfficialReportDownloadModalProps) {
    const [downloading, setDownloading] = useState(false);
    const [reportGrade, setReportGrade] = useState<any | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Filter ONLY completed grades
    const completedGrades = grades.filter(g => g.isComplete || (g.evaluations && g.evaluations.length >= 12));

    const handleSelectSubject = async (grade: any) => {
        if (downloading) return;
        setReportGrade(grade);
        setDownloading(true);

        // Allow render
        setTimeout(async () => {
            if (!reportRef.current) {
                setDownloading(false);
                return;
            }
            try {
                const canvas = await html2canvas(reportRef.current, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Official_Report_${studentName}_${grade.subjectName}.pdf`);
            } catch (error) {
                console.error('PDF Error', error);
            } finally {
                setDownloading(false);
                setReportGrade(null);
            }
        }, 1000);
    };

    // Calculate helpers (reused)
    const calculateRowTotal = (itemId: string, evalMap: any) => {
        let total = 0;
        for (let i = 1; i <= 12; i++) {
            const val = evalMap[i]?.[itemId];
            if (val) total += Number(val);
        }
        return total;
    };

    // Preparation for render
    let evalMap: any = {};
    if (reportGrade && reportGrade.evaluations) {
        reportGrade.evaluations.forEach((e: any) => {
            evalMap[e.period] = e.scores || {};
        });
    }

    const getFinalGrade = (g: any) => g.finalGrade || '-';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold">เลือกรายวิชาเพื่อดูผลประเมิน</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-green-700/50 rounded-full h-8 w-8">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 bg-[#fafbfc] min-h-[300px]">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-1 bg-green-500 rounded-full"></div>
                        <h3 className="text-slate-800 font-bold text-lg">รายการผลการเรียนที่สมบูรณ์ (Completed Courses)</h3>
                    </div>

                    {completedGrades.length > 0 ? (
                        <div className="grid gap-4 grid-cols-1">
                            {completedGrades.map((grade, idx) => (
                                <div
                                    key={idx}
                                    className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all relative overflow-hidden"
                                >
                                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">

                                        {/* Left Side: Icon & Info */}
                                        <div className="flex items-center gap-5 w-full sm:w-auto">
                                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center text-green-600 shadow-inner flex-shrink-0">
                                                <BarChart3 className="w-8 h-8" />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <h4 className="font-bold text-slate-800 text-xl leading-tight line-clamp-1">{grade.subjectName || grade.subject}</h4>
                                                <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                                                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                                        คาบที่ 12/12
                                                    </span>
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        จบหลักสูตร
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Action */}
                                        <div className="w-full sm:w-auto flex-shrink-0">
                                            <Button
                                                onClick={() => handleSelectSubject(grade)}
                                                disabled={downloading}
                                                className="w-full sm:w-auto bg-white border-2 border-slate-100 text-slate-700 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all shadow-sm rounded-xl h-12 px-6"
                                                variant="outline"
                                            >
                                                {downloading && reportGrade?._id === grade._id ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                                                        <span>กำลังสร้าง...</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Download className="w-4 h-4" />
                                                        <span>ดาวน์โหลดผลการเรียน (PDF)</span>
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                <AlertCircle className="w-10 h-10" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-400">ยังไม่มีรายวิชาที่จบหลักสูตร</h4>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2">ผลการเรียนจะปรากฏที่นี่เมื่อคุณได้รับการประเมินครบ 12 คาบ</p>
                        </div>
                    )}
                </div>

                {/* Hidden Report Template */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    {reportGrade && (
                        <div ref={reportRef} className="w-[210mm] min-h-[297mm] bg-white p-12 font-sans text-slate-900 relative flex flex-col items-center">
                            {/* Font Loader & Styles */}
                            <style>
                                {`
                                    @import url('https://fonts.googleapis.com/css2?family=Sawasdee:wght@400;700&display=swap');
                                    .font-sawasdee { font-family: 'Sawasdee', sans-serif; }
                                `}
                            </style>

                            {/* Header / Logo */}
                            <div className="w-full flex flex-col items-center justify-center mb-8 font-sawasdee">
                                <img src="/school-logo.png" alt="School Logo" className="h-24 mb-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{studentName || 'ไม่ระบุชื่อ'}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-600 min-w-[100px]">รหัสนักเรียน:</span>
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{reportGrade.studentId ? String(reportGrade.studentId).slice(-6).toUpperCase() : '-'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-600 min-w-[80px]">วิชา:</span>
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{reportGrade.subjectName}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-slate-600 min-w-[80px]">วันที่:</span>
                                        <span className="text-lg font-bold border-b border-dotted border-slate-400 flex-1">{format(new Date(), 'd MMMM yyyy', { locale: th })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Grade Display */}
                            <div className="w-full border-2 border-slate-800 rounded-lg p-8 mb-8 flex flex-col items-center justify-center bg-slate-50 font-sawasdee">
                                <p className="text-xl font-bold text-slate-700 mb-4">ผลการประเมินตลอดหลักสูตร (Term {reportGrade.term || 1})</p>
                                <div className="flex items-center gap-12">
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-500 mb-1">คะแนนรวม</p>
                                        <p className="text-4xl font-bold text-slate-900">{reportGrade.finalScore || 0}</p>
                                        <p className="text-xs text-slate-400">(เต็ม 100)</p>
                                    </div>
                                    <div className="h-16 w-0.5 bg-slate-300"></div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-500 mb-1">ระดับคะแนน</p>
                                        <div className="text-6xl font-bold text-slate-900 leading-none">{getFinalGrade(reportGrade)}</div>
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
                                    <div className="h-20 w-fit"></div>
                                    <div className="w-full border-t border-dotted border-slate-800 my-2"></div>
                                    <p className="font-bold">({studentName || '...................................'})</p>
                                    <p className="text-sm text-slate-500">นักเรียน (Student)</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="h-20 w-fit"></div>
                                    <div className="w-full border-t border-dotted border-slate-800 my-2"></div>
                                    <p className="font-bold">( นายครู ผู้สอน )</p>
                                    <p className="text-sm text-slate-500">ครูผู้สอน (Instructor)</p>
                                </div>
                            </div>

                            <div className="w-full text-center text-xs text-slate-400 mt-8 font-sawasdee">
                                <p>เอกสารฉบับนี้ออกโดยระบบอัตโนมัติของ EQ Science Learning Center</p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

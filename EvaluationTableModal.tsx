import { useState, useRef, Fragment } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, ChevronLeft, BookOpen, MessageSquare, AlertCircle, Download, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface EvaluationTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    grades: any[]; // List of Grade objects
    studentName?: string; // Passed from parent if available
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

export default function EvaluationTableModal({ isOpen, onClose, grades, studentName }: EvaluationTableModalProps) {
    const [selectedGrade, setSelectedGrade] = useState<any | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [pdfPreviewGrade, setPdfPreviewGrade] = useState<any | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Derived state for the report template (prioritize preview for download, else selected)
    const reportGrade = pdfPreviewGrade || selectedGrade;

    const handleSelectSubject = (grade: any) => {
        setSelectedGrade(grade);
    };

    const handleBack = () => {
        setSelectedGrade(null);
    };

    // Filter grades that are valid (have a subject name)
    const availableGrades = grades.filter(g => g.subjectName || g.subject);

    const evalMap: Record<number, Record<string, number>> = {};
    const commentMap: Record<number, string> = {};
    const dateMap: Record<number, string> = {};

    if (reportGrade && reportGrade.evaluations) {
        reportGrade.evaluations.forEach((e: any) => {
            evalMap[e.period] = e.scores || {};
            if (e.comment) commentMap[e.period] = e.comment;
            if (e.date) dateMap[e.period] = e.date;
        });
    }

    const calculateRowTotal = (itemId: string) => {
        let total = 0;
        for (let i = 1; i <= 12; i++) {
            const val = evalMap[i]?.[itemId];
            if (val) total += Number(val);
        }
        return total;
    };

    const calculatePeriodTotal = (periodNum: number) => {
        const periodData = evalMap[periodNum];
        if (!periodData) return 0;
        return Object.values(periodData).reduce((sum, val) => sum + (Number(val) || 0), 0);
    };

    const getFinalGrade = (g: any) => {
        if (g.finalGrade) return g.finalGrade;
        return '-';
    };

    const handleQuickDownload = async (e: React.MouseEvent, grade: any) => {
        e.stopPropagation(); // Prevent card click
        if (downloading) return;
        setDownloading(true);
        setPdfPreviewGrade(grade);

        // Wait for render
        setTimeout(async () => {
            if (!reportRef.current) {
                setDownloading(false);
                setPdfPreviewGrade(null);
                return;
            }
            try {
                const canvas = await html2canvas(reportRef.current, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Report_${grade.subjectName}.pdf`);
            } catch (error) {
                console.error('PDF Error', error);
            } finally {
                setDownloading(false);
                setPdfPreviewGrade(null);
            }
        }, 1000);
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !selectedGrade) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Report_${selectedGrade.subjectName}.pdf`);
        } catch (error) {
            console.error('PDF Error', error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setSelectedGrade(null);
                setPdfPreviewGrade(null);
            }
            onClose();
        }}>
            <DialogContent className="max-w-[100vw] w-screen h-screen flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 rounded-none border-0" aria-describedby={undefined}>
                <DialogTitle className="sr-only">
                    {selectedGrade ? `ผลการประเมิน: ${selectedGrade.subjectName}` : 'Evaluation Dashboard'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    {selectedGrade ? 'Detailed evaluation scores and feedback.' : 'List of subjects with evaluations.'}
                </DialogDescription>

                {/* Header */}
                <div className="px-6 py-4 border-b bg-green-600 flex items-center justify-between shadow-md z-30">
                    <div className="flex items-center gap-4">
                        {selectedGrade ? (
                            <Button variant="ghost" size="icon" onClick={handleBack} className="text-white hover:bg-green-700 rounded-full h-10 w-10">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full text-white">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">
                                {selectedGrade ? `ผลการประเมิน: ${selectedGrade.subjectName || selectedGrade.subject || 'ไม่ระบุวิชา'}` : 'เลือกรายวิชาเพื่อดูผลประเมิน'}
                            </h2>
                            {selectedGrade && (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-green-100 text-xs">
                                        Term {selectedGrade.term || 1} • {selectedGrade.evaluations?.length || 0}/12 คาบ
                                    </p>
                                    {selectedGrade.isComplete && (
                                        <span className="bg-white/20 text-white text-[10px] px-1.5 rounded flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> จบหลักสูตร
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedGrade && selectedGrade.isComplete && (
                            <Button
                                onClick={handleDownloadPDF}
                                disabled={downloading}
                                className="bg-white/10 hover:bg-white/20 text-white border-0"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                {downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดผลการเรียน (PDF)'}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedGrade(null); onClose() }} className="text-white hover:bg-green-700/50 rounded-full">
                            <span className="sr-only">Close</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 relative">
                    {!selectedGrade ? (
                        // View 1: Subject List
                        <div className="p-6 max-w-4xl mx-auto">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-green-600" />
                                รายวิชาที่มีผลการประเมิน
                            </h3>

                            {availableGrades.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {availableGrades.map((grade, idx) => (
                                        <Card
                                            key={idx}
                                            onClick={() => handleSelectSubject(grade)}
                                            className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-green-500 hover:-translate-y-1 group bg-white rounded-xl border-t border-r border-b border-gray-100 relative overflow-hidden"
                                        >
                                            {/* Red Dot Notification for Completion */}
                                            {grade.isComplete && (
                                                <span className="absolute top-3 right-3 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                </span>
                                            )}

                                            <CardContent className="p-6">
                                                <div className="flex items-start gap-5">
                                                    <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors shadow-sm">
                                                        <BarChart3 className="w-8 h-8" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-900 text-xl mb-1 truncate">
                                                            {grade.subjectName || grade.subject || 'ไม่ระบุชื่อวิชา'}
                                                        </h4>

                                                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                                                                ประเมินแล้ว {grade.evaluations.length}/12 คาบ
                                                            </span>
                                                        </div>

                                                        {grade.isComplete && (
                                                            <div className="space-y-3">
                                                                <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg w-fit">
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    <span>เรียนจบครบหลักสูตร</span>
                                                                </div>

                                                                <Button
                                                                    onClick={(e) => handleQuickDownload(e, grade)}
                                                                    disabled={downloading}
                                                                    variant="outline"
                                                                    className="w-full justify-center border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 h-11 text-base font-medium transition-all"
                                                                >
                                                                    {downloading && pdfPreviewGrade?._id === grade._id ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                                                                            <span>กำลังสร้าง PDF...</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <FileText className="w-4 h-4" />
                                                                            <span>ดาวน์โหลดผลการเรียน (PDF)</span>
                                                                        </div>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-slate-200">
                                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                                        <AlertCircle className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h4 className="text-lg font-medium text-slate-900">ยังไม่มีผลการประเมิน</h4>
                                    <p className="text-slate-500 mt-1">คุณยังไม่ได้รับการประเมินในรายวิชาใดๆ</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // View 2: Table
                        <div className="p-4 md:p-8 min-w-fit">
                            <div className="bg-white shadow-sm border border-slate-300">
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
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-tighter">คาบที่</span>
                                                        <span className="font-bold text-slate-900 text-lg leading-none mb-1">{i + 1}</span>
                                                        {dateMap[i + 1] && (
                                                            <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1 rounded">
                                                                {new Date(dateMap[i + 1]).toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric' })}
                                                            </span>
                                                        )}
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
                                                                const score = evalMap[periodNum]?.[item.id];
                                                                return (
                                                                    <TableCell key={periodNum} className="p-0 border-r border-slate-300 text-center relative">
                                                                        <div className="w-full h-10 flex items-center justify-center font-mono font-medium text-slate-900">
                                                                            {score ?? '-'}
                                                                        </div>
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
                                        {/* Total Row */}
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
                                        {/* Comments Row */}
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
                                                const comment = commentMap[periodNum];
                                                return (
                                                    <TableCell key={i} className="text-center border-r border-slate-300 p-1 align-top relative h-[60px]">
                                                        {comment ? (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <div className="w-full h-full min-h-[50px] rounded cursor-pointer border border-yellow-200 bg-yellow-50 text-yellow-800 flex flex-col items-center justify-center gap-1 hover:bg-yellow-100 transition-colors">
                                                                        <MessageSquare className="w-4 h-4" />
                                                                        <span className="text-[10px] truncate max-w-[50px]">อ่าน</span>
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[300px] p-4 bg-white shadow-xl border-slate-200" align="center">
                                                                    <h4 className="font-bold text-sm mb-2 text-slate-800 flex items-center gap-2">
                                                                        <MessageSquare className="h-4 w-4 text-indigo-500" />
                                                                        คำติชม (คาบ {periodNum})
                                                                    </h4>
                                                                    <p className="text-sm italic text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">"{comment}"</p>
                                                                </PopoverContent>
                                                            </Popover>
                                                        ) : <div className="text-[10px] text-slate-300 flex items-center justify-center h-full">-</div>}
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell className="bg-white sticky right-0"></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden Report Template (Rendered only when needed) */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    {reportGrade && reportGrade.isComplete && (
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
                                {/* Logo Placeholder - Expects file at /school-logo.png */}
                                <img src="/school-logo.png" alt="School Logo" className="h-24 mb-4 object-contain" onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }} />
                                <h1 className="text-3xl font-bold text-slate-900 text-center">ใบรายงานผลการเรียน</h1>
                                <h2 className="text-xl font-bold text-slate-700 text-center mt-1">สถาบันกวดวิชา EQ Science Learning Center</h2>
                                <p className="text-sm text-slate-500 mt-2">12/34 ถนนสุขุมวิท ตำบลเนินพระ อำเภอเมืองระยอง จังหวัดระยอง 21000</p>
                            </div>

                            {/* Divider */}
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

                            {/* Grade Display (Formal Box) */}
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
                                        <div className="text-6xl font-bold text-slate-900 leading-none">
                                            {getFinalGrade(reportGrade)}
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
                                    <p className="font-bold">({studentName || '...................................'})</p>
                                    <p className="text-sm text-slate-500">นักเรียน (Student)</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="h-20 w-fit">
                                        {/* Optional: Add Teacher Signature Image here if available */}
                                    </div>
                                    <div className="w-full border-t border-dotted border-slate-800 my-2"></div>
                                    <p className="font-bold">( นายครู ผู้สอน )</p>
                                    <p className="text-sm text-slate-500">ครูผู้สอน (Instructor)</p>
                                </div>
                            </div>

                            {/* Footer */}
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

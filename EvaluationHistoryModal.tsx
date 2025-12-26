import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, ChevronRight, RotateCcw } from 'lucide-react';
import { useState, Fragment } from 'react';

interface EvaluationHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    grades: any[];
}

const SKILL_STRUCTURE = [
    {
        category: '1. ด้านองค์ความรู้ (Knowledge)',
        items: [
            { id: 'knowledge_exercise', label: '1.1 แบบฝึกหัด (Exercise)', max: 5 }
        ]
    },
    {
        category: '2. ด้านการปฏิบัติ (Skill)',
        items: [
            { id: 'skill_creative', label: '2.1 ความคิดสร้างสรรค์ (Creative Thinking)', max: 5 },
            { id: 'skill_planning', label: '2.2 วางแผนการทำงาน (Planning & Time Management)', max: 5 },
            { id: 'skill_problemSolving', label: '2.3 การแก้ปัญหา (Problem Solving)', max: 5 },
            { id: 'skill_design', label: '2.4 ปรับปรุงการออกแบบ (Improve of Design)', max: 5 },
            { id: 'skill_programming', label: '2.5 ทักษะการเขียนโปรแกรม (Programming)', max: 5 },
            { id: 'skill_presentation', label: '2.6 นำเสนอผลงาน (Present)', max: 5 },
            { id: 'skill_eq', label: '2.7 ทักษะทางอารมณ์/สมาธิ (Emotional Intelligence)', max: 5 }
        ]
    }
];

export default function EvaluationHistoryModal({ isOpen, onClose, grades }: EvaluationHistoryModalProps) {
    const [selectedSubject, setSelectedSubject] = useState<any>(null);

    const handleSubjectSelect = (grade: any) => {
        setSelectedSubject(grade);
    };

    const handleBackToSubjects = () => {
        setSelectedSubject(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[90vw] h-[90vh] overflow-hidden flex flex-col p-0">
                <div className="p-6 border-b bg-white flex items-center justify-between">
                    <div>
                        <DialogTitle>ประวัติการประเมิน (Evaluation History)</DialogTitle>
                        <DialogDescription>
                            ตารางคะแนนประเมินผลทักษะตามคาบเรียน
                        </DialogDescription>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-slate-50/50">
                    {!selectedSubject ? (
                        <div className="p-6 h-full overflow-y-auto">
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {grades && grades.length > 0 ? (
                                    grades.map((grade, index) => (
                                        <div
                                            key={index}
                                            className="flex flex-col p-5 rounded-2xl border bg-white hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer group relative overflow-hidden"
                                            onClick={() => handleSubjectSelect(grade)}
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                                            <BookOpen className="h-8 w-8 text-orange-500 mb-4 relative z-10" />
                                            <h3 className="font-bold text-lg text-slate-800 relative z-10 mb-1">{grade.subjectName}</h3>
                                            <p className="text-sm text-slate-500 relative z-10">
                                                ประเมินล่าสุด: {new Date(grade.updatedAt).toLocaleDateString('th-TH')}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-24 text-slate-400 flex flex-col items-center">
                                        <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                            <BookOpen className="h-10 w-10 text-slate-300" />
                                        </div>
                                        <p className="text-lg font-medium">ยังไม่มีข้อมูลการประเมินในรายวิชาใด</p>
                                        <p className="text-sm">เมื่อมีการประเมิน รายวิชาจะปรากฏที่นี่</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <div className="bg-white px-6 py-3 border-b flex items-center justify-between shadow-sm z-20">
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" className="rounded-full h-8 w-8 p-0 hover:bg-slate-100" onClick={handleBackToSubjects}>
                                        <RotateCcw className="h-4 w-4 text-slate-600" />
                                    </Button>
                                    <div className="h-6 w-px bg-slate-200" />
                                    <h3 className="font-bold text-lg text-orange-600">
                                        {selectedSubject.subjectName}
                                    </h3>
                                </div>
                                <div className="text-sm text-slate-500">
                                    มีการประเมินทั้งหมด <span className="font-bold text-slate-900">{selectedSubject.skillHistory?.length || 0}</span> ครั้ง
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto relative bg-white">
                                <Table className="border-separate border-spacing-0 w-max min-w-full">
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[300px] min-w-[300px] sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] h-auto py-4">
                                                <div className="font-bold text-slate-900">หัวข้อการประเมิน</div>
                                                <div className="text-xs font-normal text-slate-500">Evaluation Topics</div>
                                            </TableHead>
                                            <TableHead className="w-[80px] text-center border-r h-auto py-4 bg-yellow-50/50">
                                                <div className="font-bold text-slate-900">คะแนนเต็ม</div>
                                                <div className="text-xs font-normal text-slate-500">Max</div>
                                            </TableHead>
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <TableHead key={i} className="w-[80px] min-w-[80px] text-center border-r h-auto py-4 bg-white">
                                                    <div className="font-bold text-slate-900">คาบ {i + 1}</div>
                                                    <div className="text-[10px] font-normal text-slate-500">
                                                        {(selectedSubject.skillHistory && selectedSubject.skillHistory[i])
                                                            ? new Date(selectedSubject.skillHistory[i].date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                                                            : '-'}
                                                    </div>
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-[100px] text-center bg-slate-100 h-auto py-4 sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="font-bold text-slate-900">รวม</div>
                                                <div className="text-xs font-normal text-slate-500">Total</div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {SKILL_STRUCTURE.map((group, gIdx) => (
                                            <Fragment key={group.category}>
                                                <TableRow className="bg-indigo-50/50 hover:bg-indigo-50/80">
                                                    <TableCell colSpan={15} className="font-semibold text-indigo-700 py-2 px-4 sticky left-0 z-10 bg-indigo-50/50">
                                                        {group.category}
                                                    </TableCell>
                                                </TableRow>
                                                {group.items.map((item, iIdx) => {
                                                    const skillHistory = selectedSubject.skillHistory || [];
                                                    const totalScore = skillHistory.reduce((sum: number, h: any) => sum + (h.skills?.[item.id] || 0), 0);

                                                    return (
                                                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                                                            <TableCell className="font-medium text-slate-700 sticky left-0 bg-white z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] py-2">
                                                                {item.label}
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-slate-500 border-r bg-yellow-50/30">
                                                                {item.max}
                                                            </TableCell>

                                                            {Array.from({ length: 12 }).map((_, periodIdx) => {
                                                                const historyItem = skillHistory[periodIdx];
                                                                const scoreValue = historyItem ? (historyItem.skills?.[item.id] ?? '-') : '';

                                                                return (
                                                                    <TableCell key={periodIdx} className="p-1 border-r text-center">
                                                                        <div className="h-8 flex items-center justify-center font-mono text-slate-700">
                                                                            {scoreValue}
                                                                        </div>
                                                                    </TableCell>
                                                                );
                                                            })}

                                                            <TableCell className="text-center font-bold text-slate-800 bg-slate-50 sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                                {Number(totalScore) || 0}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </Fragment>
                                        ))}

                                        {/* Total Row */}
                                        <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-200">
                                            <TableCell className="sticky left-0 bg-slate-100 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">รวมคะแนนทั้งหมด</TableCell>
                                            <TableCell className="text-center border-r">-</TableCell>
                                            {Array.from({ length: 12 }).map((_, i) => {
                                                const historyItem = selectedSubject.skillHistory?.[i];
                                                const periodTotal = historyItem
                                                    ? Object.values(historyItem.skills || {}).reduce((a: any, b: any) => a + (Number(b) || 0), 0)
                                                    : null;

                                                return (
                                                    <TableCell key={i} className="text-center border-r text-indigo-700">
                                                        {periodTotal !== null ? Number(periodTotal) : '-'}
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell className="text-center bg-slate-200 sticky right-0 z-10">-</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

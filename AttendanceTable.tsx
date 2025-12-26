import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Student {
    _id: string;
    studentName: string;
    studentId: string; // User ID
    photoURL?: string;
    displayName: string;
}

interface AttendanceRecord {
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'leave';
    remarks: string;
}

interface AttendanceTableProps {
    students: Student[];
    records: { [studentId: string]: AttendanceRecord };
    onStatusChange: (studentId: string, status: 'present' | 'absent' | 'late' | 'leave') => void;
    onRemarksChange: (studentId: string, remarks: string) => void;
    readOnly?: boolean;
}

export default function AttendanceTable({ students, records, onStatusChange, onRemarksChange, readOnly = false }: AttendanceTableProps) {
    return (
        <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[300px]">นักเรียน (Student)</TableHead>
                        <TableHead className="text-center">สถานะ (Status)</TableHead>
                        <TableHead className="w-[200px]">หมายเหตุ (Remarks)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.map(student => {
                        const record = records[student._id] || { status: 'present', remarks: '' };
                        return (
                            <TableRow key={student._id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarImage src={student.photoURL} alt={student.studentName} />
                                            <AvatarFallback>{student.studentName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-slate-900">{student.studentName || student.displayName}</div>
                                            <div className="text-xs text-slate-500">{student.studentId}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center gap-2">
                                        {[
                                            { id: 'present', label: 'มาเรียน', color: 'green' },
                                            { id: 'middle', label: '', color: 'transparent', hidden: true }, // Spacer
                                            { id: 'absent', label: 'ขาด', color: 'red' },
                                            { id: 'late', label: 'สาย', color: 'yellow' },
                                            { id: 'leave', label: 'ลา', color: 'blue' },
                                        ].filter(x => !x.hidden).map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => !readOnly && onStatusChange(student._id, option.id as any)}
                                                disabled={readOnly}
                                                className={`
                                                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                                                    ${record.status === option.id
                                                        ? `bg-${option.color}-100 text-${option.color}-700 border-${option.color}-500 shadow-sm`
                                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                                                `}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        disabled={readOnly}
                                        value={record.remarks}
                                        onChange={(e) => onRemarksChange(student._id, e.target.value)}
                                        placeholder="ระบุเหตุผล (ถ้ามี)"
                                        className="h-9"
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {students.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center py-12 text-slate-400">
                                ไม่พบรายชื่อนักเรียนในห้องนี้
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

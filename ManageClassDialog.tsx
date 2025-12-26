import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, ArrowRight, Plus, Save, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';

interface ManageClassDialogProps {
    isOpen: boolean;
    onClose: () => void;
    students: any[];
    onUpdate: () => void; // Refresh parent data
}

export default function ManageClassDialog({ isOpen, onClose, students, onUpdate }: ManageClassDialogProps) {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [targetClass, setTargetClass] = useState<string>('');
    const [isNewClass, setIsNewClass] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [filterClass, setFilterClass] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Strict Mounted Pattern
    const isMounted = useRef(false);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Derive available classes from students
    const availableClasses = Array.from(new Set(students.map(s => s.studentClass).filter(Boolean))).sort();

    // Filter students
    const filteredStudents = students.filter(s => {
        const matchesClass = filterClass === 'all' || s.studentClass === filterClass;
        const matchesSearch = s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudents(filteredStudents.map(s => s._id));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleToggleStudent = (id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (selectedStudents.length === 0) return toast.error('Please select at least one student');

        const finalClassName = isNewClass ? newClassName : targetClass;
        if (!finalClassName) return toast.error('Please specify a target class');

        setLoading(true);
        try {
            // We need a bulk update endpoint or assume one exists/we created it
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/bulk-assign-class`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    studentIds: selectedStudents,
                    className: finalClassName
                })
            });

            if (res.ok) {
                toast.success(`Moved ${selectedStudents.length} students to ${finalClassName}`);
                if (isMounted.current) { // Prevent update on unmounted if closed rapidly
                    onUpdate();
                    onClose();
                    setSelectedStudents([]);
                }
            } else {
                toast.error('Failed to update classes');
            }
        } catch (e) {
            toast.error('An error occurred');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 bg-white">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="w-5 h-5 text-indigo-600" />
                        Manage Classes (จัดห้องเรียน)
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* LEFT: Student List */}
                    <div className="w-2/3 border-r flex flex-col bg-slate-50/50">
                        <div className="p-4 border-b space-y-4">
                            <div className="flex gap-4">
                                <Select value={filterClass} onValueChange={setFilterClass}>
                                    <SelectTrigger className="w-[180px] bg-white">
                                        <SelectValue placeholder="Filter by Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search students..."
                                        className="pl-9 bg-white"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-slate-500">
                                <span>Found {filteredStudents.length} students</span>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                        onCheckedChange={handleSelectAll}
                                    />
                                    <span>Select All Filtered</span>
                                </div>
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredStudents.map(student => (
                                    <div
                                        key={student._id}
                                        onClick={() => handleToggleStudent(student._id)}
                                        className={`
                                            p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                                            ${selectedStudents.includes(student._id)
                                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedStudents.includes(student._id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                {selectedStudents.includes(student._id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-700 text-sm">{student.displayName || student.studentName}</div>
                                                <div className="text-xs text-slate-500">{student.studentClass || 'No Class'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT: Action Panel */}
                    <div className="w-1/3 bg-white flex flex-col">
                        <div className="p-6 flex-1">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <ArrowRight className="w-5 h-5 text-indigo-500" />
                                Move Selected
                            </h3>

                            <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                                <div className="text-3xl font-bold text-indigo-600 mb-1">{selectedStudents.length}</div>
                                <div className="text-sm text-indigo-600/80">Students Selected</div>
                            </div>

                            <div className="space-y-4">
                                <Label>Destination Class</Label>

                                {!isNewClass ? (
                                    <div className="space-y-2">
                                        <Select value={targetClass} onValueChange={setTargetClass}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a class..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="outline" className="w-full border-dashed" onClick={() => setIsNewClass(true)}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create New Class
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Enter new class name..."
                                            value={newClassName}
                                            onChange={e => setNewClassName(e.target.value)}
                                            autoFocus
                                        />
                                        <Button variant="ghost" className="w-full text-slate-500" onClick={() => setIsNewClass(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t bg-slate-50">
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg shadow-lg shadow-indigo-200"
                                disabled={selectedStudents.length === 0 || (!targetClass && !newClassName) || loading}
                                onClick={handleSave}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                Update Classes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

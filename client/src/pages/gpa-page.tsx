import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, TrendingUp, BookOpen } from "lucide-react";

interface Subject {
  name: string;
  marks: number;
  creditHours: number;
}

export default function GPAPage() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [semesterNo, setSemesterNo] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([{ name: "", marks: 0, creditHours: 1 }]);

  const { data: gpaHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/gpa/history"],
  });

  const addSemesterMutation = useMutation({
    mutationFn: async (data: { semesterNo: number; subjects: Subject[] }) => {
      const response = await apiRequest("POST", "/api/gpa/semester", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gpa/history"] });
      setShowAddForm(false);
      setSemesterNo(null);
      setSubjects([{ name: "", marks: 0, creditHours: 1 }]);
      toast({
        title: "Success",
        description: "Semester GPA calculated and saved successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addSubject = () => {
    setSubjects([...subjects, { name: "", marks: 0, creditHours: 1 }]);
  };

  const removeSubject = (index: number) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter((_, i) => i !== index));
    }
  };

  const updateSubject = (index: number, field: keyof Subject, value: string | number) => {
    const updated = subjects.map((subject, i) => 
      i === index ? { ...subject, [field]: value } : subject
    );
    setSubjects(updated);
  };

  const getGPAColor = (gpa: number): string => {
    if (gpa >= 3.5) return "text-green-500";
    if (gpa >= 3.0) return "text-blue-500";
    if (gpa >= 2.5) return "text-yellow-500";
    return "text-red-500";
  };

  const getGradeFromMarks = (marks: number): string => {
    if (marks >= 80) return "A (4.0)";
    if (marks >= 70) return "B (3.0)";
    if (marks >= 60) return "C (2.0)";
    if (marks >= 50) return "D (1.0)";
    return "F (0.0)";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!semesterNo) {
      toast({
        title: "Error",
        description: "Please select a semester number",
        variant: "destructive",
      });
      return;
    }

    const validSubjects = subjects.filter(s => s.name.trim() && s.marks >= 0 && s.marks <= 100 && s.creditHours > 0);
    
    if (validSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one valid subject",
        variant: "destructive",
      });
      return;
    }

    addSemesterMutation.mutate({ semesterNo, subjects: validSubjects });
  };

  if (showAddForm) {
    return (
      <div className="p-4 space-y-6 pb-24">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Add New Semester</span>
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowAddForm(false)}
                data-testid="button-close-form"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Semester Number
                </Label>
                <Select onValueChange={(value) => setSemesterNo(parseInt(value))}>
                  <SelectTrigger data-testid="select-semester">
                    <SelectValue placeholder="Select Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        Semester {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-gray-700">Subjects</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={addSubject}
                    className="text-blue-500 hover:text-blue-600"
                    data-testid="button-add-subject"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Subject
                  </Button>
                </div>

                <div className="space-y-3">
                  {subjects.map((subject, index) => (
                    <Card key={index} className="bg-gray-50 border border-gray-200">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex items-center justify-between">
                            <Input
                              placeholder="Subject Name"
                              value={subject.name}
                              onChange={(e) => updateSubject(index, "name", e.target.value)}
                              className="flex-1"
                              data-testid={`input-subject-name-${index}`}
                            />
                            {subjects.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSubject(index)}
                                className="ml-2"
                                data-testid={`button-remove-subject-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Input
                                type="number"
                                placeholder="Marks (0-100)"
                                min="0"
                                max="100"
                                value={subject.marks || ""}
                                onChange={(e) => updateSubject(index, "marks", parseInt(e.target.value) || 0)}
                                data-testid={`input-marks-${index}`}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Grade: {getGradeFromMarks(subject.marks)}
                              </p>
                            </div>
                            <Input
                              type="number"
                              placeholder="Credit Hours"
                              min="1"
                              max="6"
                              value={subject.creditHours || ""}
                              onChange={(e) => updateSubject(index, "creditHours", parseInt(e.target.value) || 1)}
                              data-testid={`input-credit-hours-${index}`}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg transform transition-transform hover:scale-[1.02]"
                disabled={addSemesterMutation.isPending}
                data-testid="button-calculate-gpa"
              >
                {addSemesterMutation.isPending ? "Calculating..." : "Calculate & Save GPA"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Add Semester Button */}
      <Button
        onClick={() => setShowAddForm(true)}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg transform transition-transform hover:scale-[1.02]"
        data-testid="button-show-add-form"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add New Semester
      </Button>

      {/* GPA History */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>GPA History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gpaHistory.length > 0 ? (
            <div className="space-y-4">
              {gpaHistory.map((record: any) => (
                <Card key={record.id} className="border border-gray-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-800">
                        Semester {record.semesterNo}
                      </h4>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getGPAColor(parseFloat(record.semesterGPA))}`}>
                          {record.semesterGPA}
                        </div>
                        <div className="text-xs text-gray-500">
                          CGPA: {record.cgpaAfterThisSemester}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {record.subjects.map((subject: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">{subject.name}</span>
                          <span className="font-medium">
                            {subject.marks} ({subject.gpa.toFixed(1)}) × {subject.creditHours} hrs
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No GPA records yet</p>
              <p className="text-xs mt-1">Add your first semester to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface Question {
    id: number;
    questionText: string;
    options: string[];
    correctAnswer: string;
}

interface Quiz {
    title: string;
    questions: Question[];
}

interface UserResponse {
    questionId: number;
    selectedOption: string;
}

interface QuizResult {
    score: number;
    totalQuestions: number;
    userResponses: UserResponse[];
}
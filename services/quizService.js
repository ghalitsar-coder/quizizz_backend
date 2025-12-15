import { supabase } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Get all quizzes for a teacher
 */
export async function getQuizzesByTeacher(teacherId) {
  try {
    const { data, error } = await supabase
      .from('quiz_packages')
      .select(`
        id,
        title,
        description,
        created_at,
        questions (
          id,
          question_text,
          options,
          time_limit,
          points
        )
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching quizzes', { error: error.message, teacherId });
      throw new Error('Failed to fetch quizzes');
    }

    return data || [];
  } catch (err) {
    logger.error('Get quizzes error', { error: err.message });
    throw err;
  }
}

/**
 * Get quiz by ID with all questions
 */
export async function getQuizById(quizId, teacherId = null) {
  try {
    let query = supabase
      .from('quiz_packages')
      .select(`
        id,
        title,
        description,
        teacher_id,
        created_at,
        questions (
          id,
          question_text,
          image_url,
          options,
          correct_idx,
          time_limit,
          points
        )
      `)
      .eq('id', quizId)
      .single();

    // If teacherId provided, verify ownership
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Quiz not found');
      }
      logger.error('Error fetching quiz', { error: error.message, quizId });
      throw new Error('Failed to fetch quiz');
    }

    return data;
  } catch (err) {
    logger.error('Get quiz error', { error: err.message });
    throw err;
  }
}

/**
 * Create a new quiz with questions (transactional)
 */
export async function createQuiz(teacherId, quizData) {
  try {
    // Start transaction (Supabase doesn't support explicit transactions,
    // so we'll use a workaround by inserting sequentially and rolling back on error)
    
    // 1. Create quiz package
    const { data: quizPackage, error: quizError } = await supabase
      .from('quiz_packages')
      .insert({
        teacher_id: teacherId,
        title: quizData.title,
        description: quizData.description || null
      })
      .select()
      .single();

    if (quizError) {
      logger.error('Error creating quiz package', { error: quizError.message });
      throw new Error('Failed to create quiz');
    }

    // 2. Create questions
    const questions = quizData.questions.map(q => ({
      quiz_id: quizPackage.id,
      question_text: q.question_text,
      image_url: q.image_url || null,
      options: q.options,
      correct_idx: q.correct_idx,
      time_limit: q.time_limit || 15,
      points: q.points || 20
    }));

    const { data: createdQuestions, error: questionsError } = await supabase
      .from('questions')
      .insert(questions)
      .select();

    if (questionsError) {
      // Rollback: delete the quiz package
      await supabase.from('quiz_packages').delete().eq('id', quizPackage.id);
      logger.error('Error creating questions', { error: questionsError.message });
      throw new Error('Failed to create questions');
    }

    logger.info('Quiz created successfully', { 
      quizId: quizPackage.id, 
      questionCount: createdQuestions.length 
    });

    return {
      ...quizPackage,
      questions: createdQuestions
    };
  } catch (err) {
    logger.error('Create quiz error', { error: err.message });
    throw err;
  }
}


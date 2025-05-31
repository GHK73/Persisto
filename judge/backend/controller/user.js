import User from '../models/file.js';

export const getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const questionsDone = user.solvedQuestions?.length || 0;

    res.json({ questionsDone });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

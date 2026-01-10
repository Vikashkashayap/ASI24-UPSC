import { getPerformanceSummary } from "../services/performanceService.js";
import { getAllStudentsPerformance } from "../services/performanceService.js";

export const getPerformance = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role || 'student';
    
    // If user is agent or admin, they can view all students' performance
    if (userRole === 'agent' || userRole === 'admin') {
      const allPerformance = await getAllStudentsPerformance();
      return res.json({ 
        ...allPerformance, 
        isAgentView: true,
        userRole 
      });
    }
    
    // Regular student view
    const performance = await getPerformanceSummary(userId);
    res.json(performance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

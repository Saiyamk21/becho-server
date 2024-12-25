import db from "../db.js";
import { v4 as uuidv4 } from 'uuid';

export const incrementClickCount = async (req, res) => {
    const { user_token } = req.body;
  
    if (!user_token) {
      return res.status(400).json({ message: 'User token is required' });
    }
  
    try {
      const tokenQuery = 'SELECT user_id FROM user_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP';
      const tokenResult = await db.query(tokenQuery, [user_token]);
  
      if (tokenResult.rows.length === 0) {
        return res.status(404).json({ message: 'Invalid or expired token' });
      }
  
      const user_id = tokenResult.rows[0].user_id;
  
      const commissionQuery = 'SELECT * FROM commissions WHERE user_id = $1';
      const commissionResult = await db.query(commissionQuery, [user_id]);
  
      let commission;
  
      if (commissionResult.rows.length === 0) {
        const insertQuery = `
          INSERT INTO commissions (user_id, sales_generated, clicks_generated, earnings, created_at, updated_at)
          VALUES ($1, 0, 1, 0.00, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *;
        `;
        const insertResult = await db.query(insertQuery, [user_id]);
        commission = insertResult.rows[0];
      } else {
        commission = commissionResult.rows[0];
        const newClicks = commission.clicks_generated + 1;
  
        const updateQuery = `
          UPDATE commissions
          SET clicks_generated = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
          RETURNING *;
        `;
        const updateResult = await db.query(updateQuery, [newClicks, user_id]);
        commission = updateResult.rows[0];
      }
  
      return res.status(200).json({
        message: 'Click count updated successfully',
        commission,
      });
    } catch (error) {
      console.error('Error updating click count:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };


  export const createUserToken = async (req, res) => {
    const { userId } = req.params;
  
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
  
    try {
      const token = uuidv4(); 
            const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const insertQuery = `
        INSERT INTO user_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      
      const result = await db.query(insertQuery, [userId, token, expiresAt]);
  
      return res.status(201).json({
        message: 'Token created successfully',
        token: result.rows[0].token,
        expires_at: result.rows[0].expires_at,
      });
    } catch (error) {
      console.error('Error creating user token:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
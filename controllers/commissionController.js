import db from "../db.js";
import { v4 as uuidv4 } from 'uuid';


export const getCommissions = async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  try {
    let start = new Date(startDate).toISOString(); // Convert to ISO format
    let end = new Date(endDate).toISOString();

    // Log the dates
    console.log("Formatted Dates:", { start, end });

    // Ensure startDate is always earlier than endDate
    if (new Date(start) > new Date(end)) {
      // Swap the dates if start is later than end
      [start, end] = [end, start];
    }

    console.log("Adjusted Dates:", { start, end });

    const query = `
        SELECT 
            COALESCE(SUM(sales_count), 0) AS total_sales_count,
            COALESCE(SUM(clicks_count), 0) AS total_clicks_count,
            COALESCE(SUM(earnings), 0.00) AS total_earnings,
            COALESCE(SUM(commission), 0.00) AS total_commission,
            COALESCE(SUM(sales_amount), 0.00) AS total_sales_amount
        FROM commissions
        WHERE user_id = $1
          AND event_timestamp BETWEEN $2 AND $3;
    `;

    console.log("Executing query:", query);

    const result = await db.query(query, [userId, start, end]);
    res.status(200).json(result.rows[0]); // Return the first row
  } catch (error) {
    console.error("Error fetching commission data:", error);
    res.status(500).json({ message: "Error fetching commission data" });
  }
};


// commissionController.js
export const insertCommissionData = async (req, res) => {
  const { userId, eventType, salesCount, clicksCount, earnings, commission, salesAmount, eventTimestamp } = req.body;

  // Prepare the dynamic fields to insert into the database
  const fields = [];
  const values = [];

  // Add fields only if they are provided in the request body
  if (salesCount !== undefined) {
      fields.push('sales_count');
      values.push(salesCount);
  }
  if (clicksCount !== undefined) {
      fields.push('clicks_count');
      values.push(clicksCount);
  }
  if (earnings !== undefined) {
      fields.push('earnings');
      values.push(earnings);
  }
  if (commission !== undefined) {
      fields.push('commission');
      values.push(commission);
  }
  if (salesAmount !== undefined) {
      fields.push('sales_amount');
      values.push(salesAmount);
  }

  // Always insert these values
  fields.push('user_id', 'event_type', 'event_timestamp');
  values.push(userId, eventType, eventTimestamp || new Date());

  try {
      const query = `
          INSERT INTO commissions (${fields.join(', ')})
          VALUES (${fields.map((_, i) => `$${i + 1}`).join(', ')}) 
          RETURNING id
      `;
      
      const result = await db.query(query, values);
      
      // Respond with the ID of the inserted record
      res.status(201).json({ id: result.rows.id, message: 'Commission data inserted successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error inserting commission data' });
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
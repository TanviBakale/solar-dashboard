import React, { useState, useEffect } from 'react';
import { Paper, Grid, Typography, Box, CircularProgress } from '@mui/material';
import { Bolt, Speed, Thermostat } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

const RealTimeReadings = ({ reading }) => {
  const [history, setHistory] = useState({ current: [], voltage: [], temperature: [] });

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/panel/history?limit=50');
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  const chartData = history.current.map((item, index) => ({
    time: formatTime(item.timestamp),
    Current: item.value,
    Voltage: history.voltage[index]?.value || 0,
    Temperature: history.temperature[index]?.value || 0,
  }));

  const StatCard = ({ icon, title, value, unit, color }) => (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `2px solid ${color}30`,
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <Box
          sx={{
            bgcolor: color,
            color: 'white',
            borderRadius: '50%',
            p: 1.5,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" color={color}>
            {value !== null && value !== undefined ? `${value} ${unit}` : '--'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Real-Time Readings
      </Typography>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<Bolt sx={{ fontSize: 32 }} />}
            title="Current"
            value={reading?.current}
            unit="A"
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<Speed sx={{ fontSize: 32 }} />}
            title="Voltage"
            value={reading?.voltage}
            unit="V"
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<Thermostat sx={{ fontSize: 32 }} />}
            title="Temperature"
            value={reading?.temperature}
            unit="°C"
            color="#d32f2f"
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Historical Trends
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Current"
                stroke="#1976d2"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Voltage"
                stroke="#2e7d32"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Temperature"
                stroke="#d32f2f"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RealTimeReadings;


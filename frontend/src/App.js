import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { Speed, Bolt, Thermostat, Analytics, Build, Visibility } from '@mui/icons-material';
import RealTimeReadings from './components/RealTimeReadings';
import DefectDetection from './components/DefectDetection';
import PanelComparison from './components/PanelComparison';
import PredictiveMaintenance from './components/PredictiveMaintenance';
import DigitalTwin from './components/DigitalTwin';
import axios from 'axios';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff9800',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  const [currentReading, setCurrentReading] = useState(null);
  const [panelInfo, setPanelInfo] = useState(null);
  const [showDigitalTwin, setShowDigitalTwin] = useState(false);

  useEffect(() => {
    // Fetch initial readings
    fetchCurrentReading();
    fetchPanelInfo();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchCurrentReading();
      fetchPanelInfo();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchCurrentReading = async () => {
    try {
      const response = await axios.get('/api/panel/current-reading');
      setCurrentReading(response.data);
    } catch (error) {
      console.error('Error fetching current reading:', error);
    }
  };

  const fetchPanelInfo = async () => {
    try {
      const response = await axios.get('/api/panel/info');
      setPanelInfo(response.data);
    } catch (error) {
      console.error('Error fetching panel info:', error);
    }
  };

  if (showDigitalTwin) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <DigitalTwin onBack={() => setShowDigitalTwin(false)} panelInfo={panelInfo} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Bolt sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Solar Panel Health Dashboard
          </Typography>
          <Button
            color="inherit"
            startIcon={<Visibility />}
            onClick={() => setShowDigitalTwin(true)}
            sx={{ mr: 2 }}
          >
            Digital Twin
          </Button>
          {panelInfo && (
            <Typography variant="body2" sx={{ mr: 2 }}>
              Panel ID: {panelInfo.panel_id}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Real-time Readings */}
          <Grid item xs={12}>
            <RealTimeReadings reading={currentReading} />
          </Grid>

          {/* Panel Comparison */}
          <Grid item xs={12} md={6}>
            <PanelComparison panelInfo={panelInfo} />
          </Grid>

          {/* Defect Detection */}
          <Grid item xs={12} md={6}>
            <DefectDetection onDetectionComplete={fetchPanelInfo} />
          </Grid>

          {/* Predictive Maintenance */}
          <Grid item xs={12}>
            <PredictiveMaintenance panelInfo={panelInfo} />
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}

export default App;


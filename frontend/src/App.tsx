import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Security,
  LockOpen,
  BatchPrediction,
  Analytics
} from '@mui/icons-material';

// Import components
import EncodeTab from './components/EncodeTab';
import DecodeTab from './components/DecodeTab';
import BatchTab from './components/BatchTab';
import AnalyzeTab from './components/AnalyzeTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Security sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            StegSafe - Advanced Steganography Tool
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="steganography tabs"
              variant="fullWidth"
            >
              <Tab
                icon={<LockOpen />}
                label="Encode Message"
                iconPosition="start"
              />
              <Tab
                icon={<Security />}
                label="Decode Message"
                iconPosition="start"
              />
              <Tab
                icon={<BatchPrediction />}
                label="Batch Processing"
                iconPosition="start"
              />
              <Tab
                icon={<Analytics />}
                label="Analyze Images"
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <EncodeTab />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <DecodeTab />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <BatchTab />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <AnalyzeTab />
          </TabPanel>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;

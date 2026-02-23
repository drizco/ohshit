import { createTheme, Theme } from '@mui/material/styles'

export function buildTheme(dark: boolean): Theme {
  return createTheme({
    palette: {
      mode: dark ? 'dark' : 'light',
      primary: { main: '#db0007' },
      secondary: { main: '#ffbc0d' },
      background: {
        default: dark ? '#282c35' : 'rgba(255, 255, 255, 0.88)',
        paper: dark ? '#282c35' : 'rgba(255, 255, 255, 0.88)',
      },
      text: {
        primary: dark ? 'rgba(255, 255, 255, 0.88)' : '#282c35',
      },
      error: { main: '#db0007' },
    },
    typography: {
      fontFamily: "'Roboto_Mono', Arial, sans-serif",
    },
    shape: { borderRadius: 0 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 0 },
        },
      },
    },
  })
}

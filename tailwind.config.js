/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 시맨틱 컬러 시스템
        primary: {
          DEFAULT: '#FF7F6E',
          light: '#FFF0ED',
          dark: '#E5614F',
        },
        accent: {
          DEFAULT: '#48D1CC',
          light: '#EDFAFA',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F8FAFC',
          tertiary: '#F1F5F9',
        },
        content: {
          DEFAULT: '#1E293B',
          secondary: '#64748B',
          tertiary: '#94A3B8',
        },
        line: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
        },
        state: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
        // 하위 호환성 유지 (기존 숫자 토큰 → 시맨틱 매핑)
        '0': '#FF7F6E',
        '1': '#48D1CC',
        '2': '#F8FAFC',
        '3': '#FFFFFF',
        '4': '#1E293B',
        '5': '#64748B',
        '6': '#FFF0ED',
        '7': '#E2E8F0',
        '8': '#CBD5E1',
        '9': '#F8FAFC',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '48px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        'full': '9999px',
        // 하위 호환
        '0': '4px',
        '1': '6px',
        '2': '8px',
        '3': '12px',
        'button': '8px',
        'input': '8px',
        'card-normal': '12px',
        'card-strong': '16px',
        'modal': '16px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04)',
        // 하위 호환
        '0': '0 1px 2px rgba(0, 0, 0, 0.04)',
        '1': '0 1px 3px rgba(0, 0, 0, 0.06)',
        '2': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'card-soft': '0 1px 3px rgba(0, 0, 0, 0.04)',
      },
      fontSize: {
        'Display-Hero': ['48px', { lineHeight: '1.1', fontWeight: '800' }],
        'KPI-Large': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'Page-Title': ['22px', { lineHeight: '1.3', fontWeight: '700' }],
        'Section-Title': ['15px', { lineHeight: '1.4', fontWeight: '600' }],
        'Body-Primary-KR': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

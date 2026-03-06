import './globals.css';
import Header from '@/components/layout/Header';

export const metadata = {
  title: 'Woozet - KBO AI 승부 예측 & 데이터 아카이브',
  description: 'KBO(한국 프로야구) 데이터를 기반으로 한 AI 승부 예측 및 데이터 아카이브 플랫폼',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans text-gray-100 bg-[#121212] min-h-screen flex flex-col">
        <Header />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}

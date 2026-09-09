
import React, { useState, useEffect } from 'react';
import { Landing } from './pages/Landing';
import { Signup } from './pages/Signup';
import { Customization } from './pages/Customization';
import { PolarisAssistant } from './components/PolarisAssistant';
import { GalaxyBackground } from './components/GalaxyBackground';
import { Page, SiteConfig, UserData } from './types';

const SESSION_KEY = "star_code_studio_session";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isChecking, setIsChecking] = useState(true);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    projectName: '',
    title: 'STAR CODE STUDIO',
    description: 'Portail de ressources haute performance.',
    testimonials: [],
    theme: 'neon',
    primaryColor: '#06b6d4',
    fontFamily: 'Outfit',
    textColor: '#FFFFFF',
    animationSpeed: 0.6,
    particleDensity: 120, 
    backgroundStyle: 'constellation',
    template: 'standard',
    deploymentType: 'premium',
    registrationUrl: '',
    resourcesUrl: ''
  });
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    try {
      // Vérification LocalStorage
      const localSession = localStorage.getItem(SESSION_KEY);
      const savedData = localSession ? JSON.parse(localSession) : null;

      if (savedData?.email && savedData?.firstName) {
        // Restore user from local storage
        const userData: UserData = {
          firstName: savedData.firstName,
          lastName: savedData.lastName || '',
          email: savedData.email,
          country: savedData.country || 'Togo',
          grade: savedData.grade || 'Général',
          ip: savedData.ip || '',
          birthDate: { day: 1, month: 1, year: 2000 },
          userAgent: navigator.userAgent
        };
        
        setUser(userData);
        if (savedData.projectName) {
          setSiteConfig(prev => ({ ...prev, projectName: savedData.projectName }));
        }
        setCurrentPage('customization');
      }
    } catch (e) {
      console.log("Session Studio : Nouveau créateur ou erreur de liaison.");
    } finally {
      // Petite latence pour laisser l'animation briller
      setTimeout(() => setIsChecking(false), 1500);
    }
  };

  const handleSignupSuccess = (userData: UserData) => {
    setUser(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ 
      email: userData.email, 
      ip: userData.ip,
      firstName: userData.firstName,
      lastName: userData.lastName,
      country: userData.country,
      grade: userData.grade,
      projectName: siteConfig.projectName
    }));
    setCurrentPage('customization');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <GalaxyBackground theme="neon" speed={0.8} density={150} style="constellation" />
        <div className="text-center space-y-8 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 border-t-2 border-cyan-500 rounded-full animate-spin mx-auto shadow-[0_0_40px_rgba(6,182,212,0.4)]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-white font-black uppercase tracking-[0.8em] text-xs italic">Star Code Studio</h2>
            <p className="text-cyan-500/40 text-[9px] font-black uppercase tracking-[0.4em] animate-pulse">Reconnaissance du créateur...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'landing': 
        return <Landing siteConfig={siteConfig} setSiteConfig={setSiteConfig} onNavigate={() => setCurrentPage('signup')} />;
      case 'signup': 
        return <Signup siteConfig={siteConfig} onSuccess={handleSignupSuccess} onBack={() => setCurrentPage('landing')} />;
      case 'customization': 
        return <Customization siteConfig={siteConfig} setSiteConfig={setSiteConfig} user={user} />;
      default: 
        return <Landing siteConfig={siteConfig} setSiteConfig={setSiteConfig} onNavigate={() => setCurrentPage('signup')} />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020617] transition-all duration-1000" style={{ fontFamily: siteConfig.fontFamily, color: siteConfig.textColor }}>
      <GalaxyBackground theme={siteConfig.theme} speed={siteConfig.animationSpeed} density={siteConfig.particleDensity} style={siteConfig.backgroundStyle} />
      <main className="relative z-10">{renderPage()}</main>
      <PolarisAssistant />
    </div>
  );
};

export default App;

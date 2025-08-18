// Type declarations for various components

declare module './TabNavigation' {
  export interface TabNavigationProps {
    activeTab: number;
    setActiveTab: (index: number) => void;
    activeCategory: string;
    setActiveCategory: (category: string) => void;
  }
  
  export const TabNavigation: React.FC<TabNavigationProps>;
}

declare module './SidebarControl' {
  export interface SidebarControlProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
  }
  
  export const SidebarControl: React.FC<SidebarControlProps>;
}

declare module './Toast' {
  export interface ToastProps {
    visible: boolean;
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
  }
  
  export const Toast: React.FC<ToastProps>;
}

declare module './Modal' {
  export interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }
  
  export const Modal: React.FC<ModalProps>;
} 
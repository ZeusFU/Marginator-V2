// Type declarations for various components

declare module './TabNavigation' {
  export interface TabNavigationProps {
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

declare module './Sidebar' {
  export interface SidebarComponentProps {
    isSidebarOpen: boolean
    setIsSidebarOpen: (open: boolean) => void
    inline?: boolean
  }
  const Sidebar: React.FC<SidebarComponentProps>
  export default Sidebar
}
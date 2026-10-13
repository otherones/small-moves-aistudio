import React from 'react';
import { Sidebar } from './Sidebar';
import { School } from '../../types';

interface HeaderProps {
  schools?: School[];
}

/**
 * Re-exports Sidebar as Header for backwards compatibility, 
 * or renders Sidebar side panel layout.
 */
export const Header: React.FC<HeaderProps> = ({ schools = [] }) => {
  return <Sidebar schools={schools} />;
};

export { Sidebar };

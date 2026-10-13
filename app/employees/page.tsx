'use client';

import LoggedLayout from '../components/LoggedLayout/LoggedLayout';
import EmployeesRegistry from '../cadastros/registries/EmployeesRegistry';

export default function EmployeesPage() {
  return (
    <LoggedLayout>
      <EmployeesRegistry />
    </LoggedLayout>
  );
}

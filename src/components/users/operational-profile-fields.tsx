'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AREA_LABELS,
  AREA_OPTIONS,
  roleDefaultArea,
  USER_ROLE_OPTIONS,
  type Area,
  type UserRole,
} from '@/lib/constants';
import { copy } from '@/lib/copy';

const NO_ROLE_VALUE = '__no_role';
const NO_AREA_VALUE = '__no_area';

interface OperationalProfileFieldsProps {
  idPrefix: string;
  initialRole?: string | null;
  initialArea?: Area | null;
  disabled?: boolean;
  resetKey?: number;
}

function isKnownRole(value: string | null | undefined): value is UserRole {
  return Boolean(value && USER_ROLE_OPTIONS.some((role) => role.value === value));
}

function isKnownArea(value: string | null | undefined): value is Area {
  return Boolean(value && value in AREA_LABELS);
}

export function OperationalProfileFields({
  idPrefix,
  initialRole,
  initialArea,
  disabled = false,
  resetKey = 0,
}: OperationalProfileFieldsProps) {
  const normalizedInitialRole = isKnownRole(initialRole) ? initialRole : null;
  const normalizedInitialArea = isKnownArea(initialArea) ? initialArea : null;
  const [role, setRole] = useState<UserRole | null>(normalizedInitialRole);
  const [area, setArea] = useState<Area | null>(
    roleDefaultArea(normalizedInitialRole) ?? normalizedInitialArea,
  );

  useEffect(() => {
    const nextRole = isKnownRole(initialRole) ? initialRole : null;
    setRole(nextRole);
    setArea(roleDefaultArea(nextRole) ?? (isKnownArea(initialArea) ? initialArea : null));
  }, [initialArea, initialRole, resetKey]);

  const automaticArea = roleDefaultArea(role);
  const effectiveArea = automaticArea ?? area;
  const helpText = useMemo(() => {
    if (automaticArea) {
      return copy.users.form.operationalProfile.autoArea(AREA_LABELS[automaticArea]);
    }

    if (effectiveArea) {
      return copy.users.form.operationalProfile.manualArea(AREA_LABELS[effectiveArea]);
    }

    return copy.users.form.operationalProfile.noArea;
  }, [automaticArea, effectiveArea]);

  const handleRoleChange = (value: string) => {
    const nextRole = value === NO_ROLE_VALUE ? null : (value as UserRole);
    setRole(nextRole);
    setArea(roleDefaultArea(nextRole));
  };

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{copy.users.form.operationalProfile.legend}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-role`}>{copy.users.form.role}</Label>
          <input type="hidden" name="role" value={role ?? ''} />
          <Select value={role ?? NO_ROLE_VALUE} onValueChange={handleRoleChange} disabled={disabled}>
            <SelectTrigger id={`${idPrefix}-role`} aria-describedby={`${idPrefix}-profile-help`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ROLE_VALUE}>{copy.users.form.noRole}</SelectItem>
              {USER_ROLE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-area`}>{copy.users.form.area}</Label>
          <input type="hidden" name="area" value={effectiveArea ?? ''} />
          <Select
            value={effectiveArea ?? NO_AREA_VALUE}
            onValueChange={(value) => setArea(value === NO_AREA_VALUE ? null : (value as Area))}
            disabled={disabled || Boolean(automaticArea)}
          >
            <SelectTrigger id={`${idPrefix}-area`} aria-describedby={`${idPrefix}-profile-help`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_AREA_VALUE}>{copy.users.form.noArea}</SelectItem>
              {AREA_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {automaticArea === item.value
                    ? copy.users.form.automaticAreaLabel(item.label)
                    : item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p id={`${idPrefix}-profile-help`} className="text-xs leading-relaxed text-muted-foreground">
        {helpText}
      </p>
    </fieldset>
  );
}

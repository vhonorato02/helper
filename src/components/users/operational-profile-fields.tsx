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
  USER_ROLE_OPTIONS,
  roleDefaultArea,
  type Area,
  type UserRole,
} from '@/lib/constants';
import { copy } from '@/lib/copy';

const NO_ROLE_VALUE = '__no_role';

interface OperationalProfileFieldsProps {
  idPrefix: string;
  initialRole?: string | null;
  initialArea?: Area | null;
  initialAreas?: readonly Area[] | null;
  disabled?: boolean;
  resetKey?: number;
}

function isKnownRole(value: string | null | undefined): value is UserRole {
  return Boolean(value && USER_ROLE_OPTIONS.some((role) => role.value === value));
}

function isKnownArea(value: string | null | undefined): value is Area {
  return Boolean(value && value in AREA_LABELS);
}

function applyRequiredRoleArea(role: UserRole | null, areas: Area[]) {
  const requiredArea = roleDefaultArea(role);
  if (!requiredArea || areas.includes(requiredArea)) return areas;
  return [requiredArea, ...areas];
}

export function OperationalProfileFields({
  idPrefix,
  initialRole,
  initialArea,
  initialAreas,
  disabled = false,
  resetKey = 0,
}: OperationalProfileFieldsProps) {
  const normalizedInitialRole = isKnownRole(initialRole) ? initialRole : null;
  const normalizedInitialArea = isKnownArea(initialArea) ? initialArea : null;
  const normalizedInitialAreas = initialAreas?.filter(isKnownArea) ?? [];
  const [role, setRole] = useState<UserRole | null>(normalizedInitialRole);
  const [areas, setAreas] = useState<Area[]>(
    applyRequiredRoleArea(
      normalizedInitialRole,
      normalizedInitialAreas.length > 0
        ? normalizedInitialAreas
        : normalizedInitialArea
          ? [normalizedInitialArea]
          : [],
    ),
  );

  useEffect(() => {
    const nextRole = isKnownRole(initialRole) ? initialRole : null;
    const nextAreas = initialAreas?.filter(isKnownArea) ?? [];
    setRole(nextRole);
    setAreas(applyRequiredRoleArea(
      nextRole,
      nextAreas.length > 0
        ? nextAreas
        : isKnownArea(initialArea)
          ? [initialArea]
          : [],
    ));
  }, [initialArea, initialAreas, initialRole, resetKey]);

  const requiredArea = roleDefaultArea(role);

  const helpText = useMemo(() => {
    if (requiredArea && areas.length === 1) {
      return copy.users.form.operationalProfile.autoArea(AREA_LABELS[requiredArea]);
    }

    if (requiredArea && areas.length > 1) {
      return copy.users.form.operationalProfile.multipleAreas(
        areas.map((item) => AREA_LABELS[item]).join(', '),
      );
    }

    if (areas.length > 1) {
      return copy.users.form.operationalProfile.multipleAreas(
        areas.map((item) => AREA_LABELS[item]).join(', '),
      );
    }

    if (areas.length === 1) {
      return copy.users.form.operationalProfile.manualArea(AREA_LABELS[areas[0]]);
    }

    return copy.users.form.operationalProfile.noArea;
  }, [areas, requiredArea]);

  const handleRoleChange = (value: string) => {
    const nextRole = value === NO_ROLE_VALUE ? null : (value as UserRole);
    setRole(nextRole);
    setAreas((current) => applyRequiredRoleArea(nextRole, current));
  };

  const toggleArea = (area: Area, checked: boolean) => {
    if (!checked && requiredArea === area) return;

    setAreas((current) => {
      if (checked && !current.includes(area)) return [...current, area];
      if (!checked) return current.filter((item) => item !== area);
      return current;
    });
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
          <Label>{copy.users.form.areas}</Label>
          <input type="hidden" name="area" value={areas[0] ?? ''} />
          <div
            className="grid gap-2 rounded-md border border-input bg-background px-3 py-2"
            aria-describedby={`${idPrefix}-profile-help`}
          >
            {AREA_OPTIONS.map((item) => (
              <label
                key={item.value}
                className="flex items-center gap-2 text-sm cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  name="areas"
                  value={item.value}
                  checked={areas.includes(item.value)}
                  onChange={(event) => toggleArea(item.value, event.currentTarget.checked)}
                  disabled={disabled}
                  aria-disabled={requiredArea === item.value}
                  className="size-4 rounded border-input accent-primary cursor-pointer disabled:cursor-not-allowed"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <p id={`${idPrefix}-profile-help`} className="text-xs leading-relaxed text-muted-foreground">
        {helpText}
      </p>
    </fieldset>
  );
}

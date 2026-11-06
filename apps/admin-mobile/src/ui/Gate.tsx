import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '../state/session';
import { Button, Card, ErrorBox, Loading, Page, T } from './index';

export function Gate({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const session = useSession();
  if (!session.ready) return <Page><Loading /></Page>;
  if (session.restoreError) return <Page><ErrorBox error={session.restoreError} retry={() => void session.restore()} />
    <Button secondary onPress={() => void session.logout()}>پاک‌کردن نشست این دستگاه</Button></Page>;
  if (!session.manager) return <Redirect href="/login" />;
  if (permission && !session.can(permission)) return <Page><Card><T>برای این بخش مجوز کافی ندارید؛ از مدیر اصلی درخواست دسترسی کنید.</T></Card></Page>;
  return <>{children}</>;
}

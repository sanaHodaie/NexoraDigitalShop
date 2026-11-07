import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../src/state/session';
import type { Dashboard, RequestStats } from '../../src/api/types';
import { catalogueRial, number } from '../../src/lib/format';
import { Badge, Button, Card, colors, ErrorBox, Loading, Metric, Page, styles, T, Title, Updated } from '../../src/ui';
import { HomeHero } from '../../src/ui/HomeHero';
import { useLayout } from '../../src/state/layout';

export default function Home() {
  const { api, can, manager } = useSession();
  const { desktop } = useLayout();
  const dashboard = useQuery({ queryKey: ['dashboard'], enabled: can('dashboard:read'),
    queryFn: ({ signal }) => api.request<Dashboard>('/api/admin/dashboard', { signal }) });
  const requests = useQuery({ queryKey: ['request-stats'], enabled: can('orders:read'),
    queryFn: ({ signal }) => api.request<RequestStats>('/api/admin/customer-request-stats', { signal }) });
  const reload = () => { if (can('dashboard:read')) void dashboard.refetch(); if (can('orders:read')) void requests.refetch(); };
  const d = dashboard.data, r = requests.data;
  const daily = r?.daily || [];
  const max = Math.max(1, ...daily.map(x => x.requests));
  return <Page onRefresh={reload} refreshing={dashboard.isRefetching || requests.isRefetching}>
    <Title title="نمای امروز کسب‌وکار" subtitle={`سلام ${manager?.name || 'مدیر نکسورا'}؛ کارهای مهم را از اینجا دنبال کنید.`} />
    <HomeHero requests={r} onOpen={can('orders:read') ? () => router.push('/(tabs)/requests') : undefined} />
    <ErrorBox error={dashboard.error || requests.error} retry={reload} />
    {(dashboard.isLoading || requests.isLoading) && <Loading />}
    {d && <View style={[styles.row, { flexWrap: 'wrap', alignItems: 'stretch' }]}>
      <Metric label="فروش پرداخت‌شده · کل" value={catalogueRial(d.revenue)} icon="wallet-outline" />
      <Metric label="سفارش‌های سایت · کل" value={number(d.orders)} icon="bag-handle-outline" />
      <Metric label="محصول کم‌موجودی" value={number(d.lowStock)} icon="cube-outline" accent="#2098AF" />
      <Metric label="حساب مشتریان" value={number(d.users)} icon="people-outline" accent="#6686DB" />
    </View>}
    <View style={{ flexDirection: desktop ? 'row-reverse' : 'column', gap: 20, alignItems: 'stretch' }}>
    {r && <Card style={{ flex: desktop ? 1.45 : undefined }}><View style={[styles.row, { justifyContent: 'space-between' }]}><T style={styles.label}>روند درخواست‌های تلگرام</T><Badge>۳۰ روز اخیر</Badge></View>
      <View accessible accessibilityLabel={daily.map(x => `${x.day}: ${x.requests} درخواست`).join('، ')}
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 96, paddingTop: 16 }}>
        {daily.map(x => <View key={x.day} style={{ flex: 1, height: Math.max(3, x.requests / max * 80),
          backgroundColor: x.requests ? colors.blue : colors.line, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />)}
      </View><View style={[styles.row, { justifyContent: 'space-between' }]}><T style={styles.muted}>امروز</T><T style={styles.muted}>۲۹ روز قبل</T></View>
      <T style={styles.muted}>کل درخواست‌ها: {number(r.total)} · تأییدشده: {number(r.statuses.approved || 0)}</T>
    </Card>}
    <Card style={{ flex: desktop ? 1 : undefined }}><T style={styles.label}>رادار عملیاتی</T>
      {!!r?.statuses.new && <T>• {number(r.statuses.new)} درخواست جدید نیاز به رسیدگی دارد.</T>}
      {!!d?.lowStock && <T>• موجودی {number(d.lowStock)} محصول فعال کمتر از ۵ است.</T>}
      {r && d && !r.statuses.new && !d.lowStock && <T>هشداری بر اساس این دو قاعده وجود ندارد.</T>}
      <T style={styles.muted}>این هشدارها بر اساس قواعد مشخص و دادهٔ واقعی‌اند؛ تحلیل پیش‌بینی نیستند.</T>
    </Card></View>
    {can('orders:read') && <Button secondary onPress={() => router.push('/orders')}>مشاهدهٔ سفارش‌های سایت</Button>}
    <Updated at={Math.max(dashboard.dataUpdatedAt, requests.dataUpdatedAt)} />
    <Button secondary onPress={reload}>تازه‌سازی داشبورد</Button>
  </Page>;
}

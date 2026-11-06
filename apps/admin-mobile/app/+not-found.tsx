import { router } from 'expo-router';
import { Button, Card, Page, T, Title } from '../src/ui';
export default function NotFound() { return <Page><Title title="این مسیر پیدا نشد" /><Card><T>از خانهٔ مدیریت ادامه دهید.</T>
  <Button onPress={() => router.replace('/')}>بازگشت به خانه</Button></Card></Page>; }

import React from 'react';
import { Modal } from './ManagementUI';
import InvoiceView from '../../../src/components/Orders/InvoiceView';

export default function InvoiceModal({ order, onClose }) {
  return <Modal title={`فاکتور سفارش ${order.id}`} onClose={onClose}>
    <InvoiceView id={order.id} admin />
  </Modal>;
}

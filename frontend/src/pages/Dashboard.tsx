import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Form, Input, message, Spin, Empty } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useFundStore, getSortedFunds, getVisibleFunds } from '../store/fundStore';
import { createRealtimeNavWebSocket } from '../api/websocket';
import FundCard from '../components/dashboard/FundCard';
import type { Fund } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    funds,
    preferences,
    loading,
    error,
    fetchFunds,
    fetchPreferences,
    addFund,
    deleteFund,
    updateFund,
    updateRealtimeNav,
    updatePreference,
    updateSortOrder,
    realtimeNav,
  } = useFundStore();

  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const init = async () => {
      await fetchFunds();
      await fetchPreferences();
    };
    init();
     
  }, [fetchFunds, fetchPreferences]);

  // Setup WebSocket connections for visible funds only
  useEffect(() => {
    const wsClients: { disconnect: () => void }[] = [];
    const displayFunds = isEditMode ? getSortedFunds(useFundStore.getState()) : getVisibleFunds(useFundStore.getState());

    displayFunds.forEach((fund) => {
      const ws = createRealtimeNavWebSocket(fund.code);
      ws.connect()
        .then(() => {
          ws.onMessage((msg) => {
            if (msg.type === 'nav_update') {
              updateRealtimeNav(fund.code, msg.data);
            }
          });
          wsClients.push(ws);
        })
        .catch((err) => {
          console.error(`Failed to connect WebSocket for ${fund.code}:`, err);
        });
    });

    return () => {
      wsClients.forEach((ws) => ws.disconnect());
    };
  }, [funds, preferences, isEditMode, updateRealtimeNav]);

  const handleAddFund = async (values: { code: string; name?: string; type?: string; company?: string }) => {
    try {
      await addFund(values);
      message.success('Fund added successfully');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || 'Failed to add fund');
    }
  };

  const handleEditFund = async (values: { name: string; type?: string; company?: string }) => {
    if (!editingFund) return;
    try {
      await updateFund(editingFund.code, values);
      message.success('Fund updated successfully');
      setIsEditModalOpen(false);
      setEditingFund(null);
      editForm.resetFields();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || 'Failed to update fund');
    }
  };

  const openEditModal = (fund: Fund) => {
    setEditingFund(fund);
    editForm.setFieldsValue({
      name: fund.name,
      type: fund.type,
      company: fund.company,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteFund = async (code: string) => {
    Modal.confirm({
      title: 'Delete Fund',
      content: 'Are you sure you want to remove this fund from tracking?',
      onOk: async () => {
        try {
          await deleteFund(code);
          message.success('Fund deleted successfully');
        } catch {
          message.error('Failed to delete fund');
        }
      },
    });
  };

  const handleRefresh = () => {
    fetchFunds();
    message.info('Refreshing fund data...');
  };

  const handleToggleVisible = async (fund: Fund, isVisible: boolean) => {
    try {
      await updatePreference(fund.id, isVisible);
      message.success(isVisible ? 'Fund added to dashboard' : 'Fund hidden from dashboard');
    } catch (error: unknown) {
      message.error('Failed to update preference');
    }
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const displayFunds = getSortedFunds(useFundStore.getState());
      const oldIndex = displayFunds.findIndex((f) => f.id === active.id);
      const newIndex = displayFunds.findIndex((f) => f.id === over.id);

      const newOrder = arrayMove(displayFunds, oldIndex, newIndex);
      const updates = newOrder.map((fund, index) => ({
        fundId: fund.id,
        sortOrder: index,
      }));

      await updateSortOrder(updates);
    }
  }, [updateSortOrder]);

  const displayFunds = isEditMode ? getSortedFunds(useFundStore.getState()) : getVisibleFunds(useFundStore.getState());

  if (loading && funds.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Fund Dashboard</h1>
        <div>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} style={{ marginRight: '8px' }}>
            Refresh
          </Button>
          <Button
            icon={isEditMode ? <EditOutlined /> : <EditOutlined />}
            onClick={() => setIsEditMode(!isEditMode)}
            style={{ marginRight: '8px' }}
            type={isEditMode ? 'default' : 'default'}
          >
            {isEditMode ? 'Done' : 'Edit'}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Fund
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px', color: '#cf1322' }}>
          {error}
        </div>
      )}

      {displayFunds.length === 0 && !isEditMode ? (
        <Card
          style={{ textAlign: 'center', padding: '48px' }}
          title="No funds displayed"
        >
          <p style={{ marginBottom: '24px', fontSize: '16px' }}>
            You haven't selected any funds to display on your dashboard.
          </p>
          <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditMode(true)}>
            Edit and select funds to display
          </Button>
        </Card>
      ) : displayFunds.length === 0 && isEditMode ? (
        <Empty description="No funds added yet. Add a fund to get started." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayFunds.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-8px' }}>
              {displayFunds.map((fund) => {
                const nav = realtimeNav[fund.code];
                const prefMap = new Map(preferences.map((p) => [p.fund_id, p]));
                const pref = prefMap.get(fund.id);
                const isVisible = pref?.is_visible ?? true;

                return (
                  <FundCard
                    key={fund.id}
                    fund={fund}
                    nav={nav}
                    isEditMode={isEditMode}
                    isVisible={isVisible}
                    onToggleVisible={(v) => handleToggleVisible(fund, v)}
                    onEdit={openEditModal}
                    onDelete={handleDeleteFund}
                    onClick={() => navigate(`/fund/${fund.code}`)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        title="Add Fund"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddFund}>
          <Form.Item
            label="Fund Code"
            name="code"
            rules={[{ required: true, message: 'Please enter fund code' }]}
          >
            <Input placeholder="e.g., 001186" />
          </Form.Item>

          <Form.Item label="Fund Name" name="name">
            <Input placeholder="Leave empty to auto-fetch" />
          </Form.Item>

          <Form.Item label="Type" name="type">
            <Input placeholder="e.g., 股票型" />
          </Form.Item>

          <Form.Item label="Company" name="company">
            <Input placeholder="e.g., 富国基金" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Add Fund
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Fund"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingFund(null);
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditFund}>
          <Form.Item
            label="Fund Name"
            name="name"
            rules={[{ required: true, message: 'Please enter fund name' }]}
          >
            <Input placeholder="e.g., 富国文体健康股票" />
          </Form.Item>

          <Form.Item label="Type" name="type">
            <Input placeholder="e.g., 股票型" />
          </Form.Item>

          <Form.Item label="Company" name="company">
            <Input placeholder="e.g., 富国基金" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Dashboard;

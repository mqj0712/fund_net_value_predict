import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Modal, Form, Input, message, Spin, Empty, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { useFundStore } from '../store/fundStore';
import { createRealtimeNavWebSocket } from '../api/websocket';
import type { RealtimeNav } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { funds, loading, error, fetchFunds, addFund, deleteFund, updateFund, updateRealtimeNav, realtimeNav } =
    useFundStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<{ code: string; name: string; type: string; company: string } | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchFunds();
  }, []);

  // Setup WebSocket connections for all funds
  useEffect(() => {
    const wsClients: any[] = [];

    funds.forEach((fund) => {
      const ws = createRealtimeNavWebSocket(fund.code);
      ws.connect()
        .then(() => {
          ws.onMessage((msg) => {
            if (msg.type === 'nav_update') {
              updateRealtimeNav(fund.code, msg.data as RealtimeNav);
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
  }, [funds]);

  const handleAddFund = async (values: any) => {
    try {
      await addFund(values);
      message.success('Fund added successfully');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to add fund');
    }
  };

  const handleEditFund = async (values: any) => {
    if (!editingFund) return;
    try {
      await updateFund(editingFund.code, values);
      message.success('Fund updated successfully');
      setIsEditModalOpen(false);
      setEditingFund(null);
      editForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to update fund');
    }
  };

  const openEditModal = (fund: any) => {
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
        } catch (error: any) {
          message.error('Failed to delete fund');
        }
      },
    });
  };

  const handleRefresh = () => {
    fetchFunds();
    message.info('Refreshing fund data...');
  };

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

      {funds.length === 0 ? (
        <Empty description="No funds tracked yet. Add a fund to get started." />
      ) : (
        <Row gutter={[16, 16]}>
          {funds.map((fund) => {
            const nav = realtimeNav[fund.code];
            const changeColor = nav?.change_percent > 0 ? '#cf1322' : nav?.change_percent < 0 ? '#3f8600' : '#000';

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={fund.id}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fund.name}
                      </span>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(fund);
                        }}
                        style={{ flexShrink: 0 }}
                      />
                    </div>
                  }
                  extra={
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFund(fund.code);
                      }}
                    />
                  }
                  hoverable
                  onClick={() => navigate(`/fund/${fund.code}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Code: {fund.code}</div>
                    {fund.type && <div style={{ fontSize: '12px', color: '#8c8c8c' }}>Type: {fund.type}</div>}
                  </div>

                  {nav ? (
                    <>
                      <Statistic
                        title="Estimated NAV"
                        value={nav.estimated_nav}
                        precision={4}
                        valueStyle={{ fontSize: '24px' }}
                      />
                      <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 'bold', color: changeColor }}>
                        {nav.change_percent > 0 ? '+' : ''}
                        {nav.change_percent.toFixed(2)}%
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                        {nav.is_trading_hours ? 'Trading' : 'Closed'}
                      </div>
                    </>
                  ) : (
                    <Spin />
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
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

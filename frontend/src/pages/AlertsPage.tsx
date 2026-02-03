import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  InputNumber,
  Select,
  Switch,
  message,
  Tag,
  Popconfirm,
  Empty,
} from 'antd';
import { PlusOutlined, DeleteOutlined, BellOutlined } from '@ant-design/icons';
import { useAlertStore } from '../store/alertStore';
import { useFundStore } from '../store/fundStore';
import type { Alert } from '../types';

const AlertsPage: React.FC = () => {
  const { alerts, loading, fetchAlerts, createAlert, deleteAlert, toggleAlert } = useAlertStore();
  const { funds, fetchFunds } = useFundStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAlerts();
    fetchFunds();
  }, []);

  const handleCreateAlert = async (values: any) => {
    try {
      await createAlert(values);
      message.success('创建成功');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.detail || '创建失败');
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await deleteAlert(id);
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggleAlert = async (id: number) => {
    try {
      await toggleAlert(id);
      message.success('状态已更新');
    } catch (error) {
      message.error('更新失败');
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'price_above':
        return '价格高于';
      case 'price_below':
        return '价格低于';
      case 'change_percent':
        return '涨跌幅超过';
      default:
        return type;
    }
  };

  const getAlertTypeColor = (type: string) => {
    switch (type) {
      case 'price_above':
        return 'red';
      case 'price_below':
        return 'green';
      case 'change_percent':
        return 'blue';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: '基金',
      key: 'fund',
      render: (_: any, record: Alert) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.fund?.name}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.fund?.code}</div>
        </div>
      ),
    },
    {
      title: '提醒类型',
      dataIndex: 'alert_type',
      key: 'alert_type',
      render: (type: string) => (
        <Tag color={getAlertTypeColor(type)}>{getAlertTypeText(type)}</Tag>
      ),
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (threshold: number, record: Alert) => {
        if (record.alert_type === 'change_percent') {
          return `${threshold.toFixed(2)}%`;
        }
        return `¥${threshold.toFixed(4)}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record: Alert) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleAlert(record.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '最后触发',
      dataIndex: 'last_triggered',
      key: 'last_triggered',
      render: (lastTriggered: string | null) => {
        if (!lastTriggered) return '-';
        return new Date(lastTriggered).toLocaleString('zh-CN');
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt: string) => new Date(createdAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Alert) => (
        <Popconfirm
          title="确定删除这个提醒吗？"
          onConfirm={() => handleDeleteAlert(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>
          <BellOutlined /> 价格提醒
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          创建提醒
        </Button>
      </div>

      <Card>
        {alerts.length === 0 ? (
          <Empty description="暂无提醒，创建一个提醒来监控基金价格变化" />
        ) : (
          <Table
            columns={columns}
            dataSource={alerts}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        )}
      </Card>

      {/* Create Alert Modal */}
      <Modal
        title="创建价格提醒"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAlert}>
          <Form.Item
            label="选择基金"
            name="fund_id"
            rules={[{ required: true, message: '请选择基金' }]}
          >
            <Select
              showSearch
              placeholder="搜索基金"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={funds.map((fund) => ({
                value: fund.id,
                label: `${fund.code} - ${fund.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="提醒类型"
            name="alert_type"
            rules={[{ required: true, message: '请选择提醒类型' }]}
          >
            <Select
              placeholder="选择提醒类型"
              options={[
                { value: 'price_above', label: '价格高于（净值超过设定值时提醒）' },
                { value: 'price_below', label: '价格低于（净值低于设定值时提醒）' },
                { value: 'change_percent', label: '涨跌幅超过（单日涨跌幅超过设定值时提醒）' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="阈值"
            name="threshold"
            rules={[{ required: true, message: '请输入阈值' }]}
            extra={
              <div style={{ marginTop: '8px', color: '#8c8c8c' }}>
                <div>• 价格高于/低于：输入净值，例如 1.5000</div>
                <div>• 涨跌幅超过：输入百分比，例如 2.5 表示 2.5%</div>
              </div>
            }
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={4}
              style={{ width: '100%' }}
              placeholder="输入阈值"
            />
          </Form.Item>

          <Form.Item label="启用状态" name="is_active" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              创建提醒
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AlertsPage;

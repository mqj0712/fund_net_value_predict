import React from 'react';
import { Card, Col, Button, Switch, Spin, Statistic } from 'antd';
import { EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Fund, RealtimeNav } from '../../types';

interface FundCardProps {
  fund: Fund;
  nav?: RealtimeNav;
  isEditMode: boolean;
  isVisible: boolean;
  onToggleVisible: (isVisible: boolean) => void;
  onEdit: (fund: Fund) => void;
  onDelete: (code: string) => void;
  onClick: () => void;
}

const FundCard: React.FC<FundCardProps> = ({
  fund,
  nav,
  isEditMode,
  isVisible,
  onToggleVisible,
  onEdit,
  onDelete,
  onClick,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fund.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isEditMode ? 'grab' : 'pointer',
  };

  const changeColor = nav?.change_percent && nav.change_percent > 0 ? '#cf1322' : nav?.change_percent && nav.change_percent < 0 ? '#3f8600' : '#000';

  return (
    <Col xs={24} sm={12} md={8} lg={6} style={{ padding: '8px' }}>
      <div ref={setNodeRef} style={style}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fund.name}
              </span>
              {isEditMode && (
                <Switch
                  checked={isVisible}
                  onChange={onToggleVisible}
                  style={{ width: '40px' }}
                />
              )}
            </div>
          }
          extra={
            <div style={{ display: 'flex', gap: '4px' }}>
              {isEditMode && (
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(fund);
                  }}
                />
              )}
              {isEditMode && (
                <DragOutlined
                  style={{ cursor: 'grab', color: '#999' }}
                  {...attributes}
                  {...listeners}
                />
              )}
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(fund.code);
                }}
              />
            </div>
          }
          hoverable={!isEditMode}
          onClick={isEditMode ? undefined : onClick}
          style={{
            cursor: isEditMode ? 'default' : 'pointer',
            border: !isVisible ? '2px dashed #d9d9d9' : undefined,
            backgroundColor: !isVisible ? '#fafafa' : undefined,
          }}
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
      </div>
    </Col>
  );
};

export default FundCard;

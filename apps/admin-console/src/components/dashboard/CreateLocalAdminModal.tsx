'use client';

import { Form, Input, Modal, Select, type FormInstance } from 'antd';
import type {
  CreateLocalAdminInput,
  CreateLocalAdminRole,
  TenantOption,
} from '@interview-agent/contracts';
import React from 'react';

type CreateLocalAdminModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  isTenantsLoading: boolean;
  tenants: TenantOption[];
  onCancel: () => void;
  onSubmit: (input: CreateLocalAdminInput) => void;
};

export const LOCAL_ADMIN_FORM_LABELS = {
  password: '初始密码',
  role: '管理员角色',
};

export const LOCAL_ADMIN_ROLE_OPTIONS: { label: string; value: CreateLocalAdminRole }[] = [
  { label: '平台管理员', value: 'platform_admin' },
  { label: '租户管理员', value: 'admin' },
];

export function CreateLocalAdminModal(props: CreateLocalAdminModalProps) {
  const [form] = Form.useForm<CreateLocalAdminInput>();
  const role = Form.useWatch('role', form) ?? 'platform_admin';

  return (
    <Modal
      afterClose={() => form.resetFields()}
      confirmLoading={props.isSaving}
      destroyOnHidden
      okText="创建管理员"
      open={props.isOpen}
      title="新增管理员"
      onCancel={props.onCancel}
      onOk={() => form.submit()}
    >
      <AdminCreationForm form={form} role={role} {...props} />
    </Modal>
  );
}

function AdminCreationForm(
  props: Pick<CreateLocalAdminModalProps, 'isTenantsLoading' | 'tenants' | 'onSubmit'> & {
    form: FormInstance<CreateLocalAdminInput>;
    role: CreateLocalAdminRole;
  },
) {
  return (
    <Form
      form={props.form}
      initialValues={{ role: 'platform_admin' }}
      layout="vertical"
      onFinish={props.onSubmit}
      onValuesChange={(changed) => resetTenantForPlatformAdmin(changed, props.form)}
    >
      <AdminIdentityFields />
      <Form.Item label={LOCAL_ADMIN_FORM_LABELS.role} name="role" rules={[{ required: true }]}>
        <Select options={LOCAL_ADMIN_ROLE_OPTIONS} />
      </Form.Item>
      {props.role === 'admin' ? <TenantField {...props} /> : null}
    </Form>
  );
}

function AdminIdentityFields() {
  return (
    <>
      <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
        <Input autoComplete="name" maxLength={80} />
      </Form.Item>
      <Form.Item
        label="邮箱"
        name="email"
        rules={[{ required: true, type: 'email', message: '请输入有效的邮箱地址' }]}
      >
        <Input autoComplete="email" />
      </Form.Item>
      <Form.Item
        label={LOCAL_ADMIN_FORM_LABELS.password}
        name="password"
        rules={[{ required: true, message: '请输入初始密码' }]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
    </>
  );
}

function TenantField(props: Pick<CreateLocalAdminModalProps, 'isTenantsLoading' | 'tenants'>) {
  return (
    <Form.Item
      label="所属租户"
      name="tenantSlug"
      rules={[{ required: true, message: '请选择所属租户' }]}
    >
      <Select
        loading={props.isTenantsLoading}
        optionFilterProp="label"
        options={props.tenants.map((tenant) => ({
          label: tenant.name + '（' + tenant.slug + '）',
          value: tenant.slug,
        }))}
        showSearch
      />
    </Form.Item>
  );
}

function resetTenantForPlatformAdmin(
  changed: Partial<CreateLocalAdminInput>,
  form: FormInstance<CreateLocalAdminInput>,
) {
  if (changed.role === 'platform_admin') form.setFieldValue('tenantSlug', undefined);
}

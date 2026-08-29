/**
 * Settings rows - reusable iOS-styled rows and pickers for settings screens.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { colors } from '../../theme/colors';

interface SettingItemProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showDisclosure?: boolean;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  rightElement,
  onPress,
  showDisclosure = true,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={onPress ? 0.6 : 1}
    disabled={!onPress}>
    <View style={styles.settingInfo}>
      <ThemedText variant="body">{title}</ThemedText>
      {subtitle ? (
        <ThemedText variant="footnote" color="secondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
    <View style={styles.settingRight}>
      {rightElement}
      {showDisclosure && onPress && (
        <ThemedText variant="body" color="muted" style={styles.disclosure}>
          ›
        </ThemedText>
      )}
    </View>
  </TouchableOpacity>
);

export const Separator: React.FC = () => <View style={styles.separator} />;

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  tint: string;
}

export const SwitchRow: React.FC<SwitchRowProps> = ({ title, subtitle, value, onChange, tint }) => (
  <SettingItem
    title={title}
    subtitle={subtitle}
    showDisclosure={false}
    rightElement={
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.FILL, true: tint }} />
    }
  />
);

export interface Option {
  value: string | number;
  label: string;
}

interface ChoiceRowProps {
  title: string;
  value: string | number;
  options: Option[];
  onSelect: (value: string | number) => void;
}

export const ChoiceRow: React.FC<ChoiceRowProps> = ({ title, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <SettingItem title={title} subtitle={selected?.label} onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <ThemedText variant="title2" style={styles.modalTitle}>
              {title}
            </ThemedText>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}>
                  <ThemedText variant="body" color={isSelected ? 'primary' : undefined}>
                    {option.label}
                  </ThemedText>
                  {isSelected && <ThemedText color="primary">✓</ThemedText>}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

interface KeyRowProps {
  label: string;
  value?: string;
  onSave: (value: string) => void;
  isSecret?: boolean;
}

export const KeyRow: React.FC<KeyRowProps> = ({ label, value, onSave, isSecret }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  return (
    <>
      <SettingItem
        title={label}
        subtitle={value ? (isSecret ? '••••••••' : value) : 'Not set'}
        onPress={() => {
          setText(value ?? '');
          setOpen(true);
        }}
      />
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <ThemedText variant="title2" style={styles.modalTitle}>
              {label}
            </ThemedText>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={isSecret}
              placeholder="Enter value"
              placeholderTextColor={colors.MUTED}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalActionButton} onPress={() => setOpen(false)}>
                <ThemedText variant="body" color="secondary">
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, { backgroundColor: colors.PRIMARY }]}
                onPress={() => {
                  onSave(text.trim());
                  setOpen(false);
                }}>
                <ThemedText variant="body" style={{ color: '#FFF' }}>
                  Save
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclosure: {
    marginLeft: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.SEPARATOR,
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSheet: {
    width: '82%',
    maxHeight: '70%',
    backgroundColor: colors.SURFACE,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.SEPARATOR,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.SEPARATOR,
    borderRadius: 8,
    padding: 12,
    color: colors.TEXT_PRIMARY,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
});

export default {
  SettingItem,
  Separator,
  SwitchRow,
  ChoiceRow,
  KeyRow,
};
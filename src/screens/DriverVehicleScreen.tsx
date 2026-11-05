import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { UserUtils } from '../utils/UserUtils';

export type VehicleType = 'motorcycle' | 'car' | 'bicycle';

export type VehicleFormState = {
  type: string;
  brand: string;
  model: string;
  year: string;
  plate: string;
  color: string;
};

export type VehicleOnlyPayload = {
  vehicle: {
    type: VehicleType;
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
  };
};

const VEHICLE_TYPES: VehicleType[] = ['motorcycle', 'car', 'bicycle'];

export const emptyVehicleForm = (): VehicleFormState => ({
  type: '',
  brand: '',
  model: '',
  year: '',
  plate: '',
  color: '',
});

export const formFromDriverVehicle = (
  vehicle: DeliveryDriver['vehicle'] | undefined | null
): VehicleFormState | null => {
  if (!vehicle) {
    return null;
  }
  return {
    type: String(vehicle.type ?? ''),
    brand: String(vehicle.brand ?? ''),
    model: String(vehicle.model ?? ''),
    year: vehicle.year != null ? String(vehicle.year) : '',
    plate: String(vehicle.plate ?? ''),
    color: String(vehicle.color ?? ''),
  };
};

export const validateVehicleForm = (
  form: VehicleFormState
): { ok: true; payload: VehicleOnlyPayload } | { ok: false; message: string } => {
  const type = form.type.trim() as VehicleType;
  const brand = form.brand.trim();
  const model = form.model.trim();
  const yearRaw = form.year.trim();
  const plate = form.plate.trim();
  const color = form.color.trim();

  if (!type || !brand || !model || !yearRaw || !plate || !color) {
    return { ok: false, message: 'Preencha todos os seis campos do veículo.' };
  }

  if (!VEHICLE_TYPES.includes(type)) {
    return {
      ok: false,
      message: 'Tipo de veículo inválido. Use motorcycle, car ou bicycle.',
    };
  }

  const year = Number(yearRaw);
  if (!Number.isFinite(year) || !Number.isInteger(year) || year < 1900 || year > 2100) {
    return { ok: false, message: 'Informe um ano válido para o veículo.' };
  }

  return {
    ok: true,
    payload: {
      vehicle: { type, brand, model, year, plate, color },
    },
  };
};

export const assertDriverOwnership = (
  authUserId: string | undefined,
  driver: DeliveryDriver | null | undefined
): { ok: true; driver: DeliveryDriver } | { ok: false; message: string } => {
  if (!authUserId) {
    return { ok: false, message: 'Usuário não autenticado.' };
  }
  if (!driver) {
    return { ok: false, message: 'Cadastro de entregador não encontrado.' };
  }
  if (!driver.id || typeof driver.id !== 'string' || !driver.id.trim()) {
    return { ok: false, message: 'Registro de entregador inválido.' };
  }
  if (driver.userId !== authUserId) {
    return { ok: false, message: 'Registro não pertence ao usuário autenticado.' };
  }
  if (!driver.vehicle) {
    return { ok: false, message: 'Dados do veículo indisponíveis.' };
  }
  return { ok: true, driver };
};

type DriverVehicleServicePort = {
  getDriverByUserId: (userId: string) => Promise<DeliveryDriver | null>;
  updateDriver: (driverId: string, updates: VehicleOnlyPayload) => Promise<void>;
};

export type LoadDriverVehicleResult =
  | {
      ok: true;
      authUserId: string;
      driverId: string;
      form: VehicleFormState;
    }
  | { ok: false; message: string };

export async function loadDriverVehicleForEdit(
  authUserId: string | undefined,
  service: DriverVehicleServicePort
): Promise<LoadDriverVehicleResult> {
  if (!authUserId) {
    return { ok: false, message: 'Usuário não autenticado.' };
  }

  const driver = await service.getDriverByUserId(authUserId);
  const ownership = assertDriverOwnership(authUserId, driver);
  if (!ownership.ok) {
    return { ok: false, message: ownership.message };
  }

  const form = formFromDriverVehicle(ownership.driver.vehicle);
  if (!form) {
    return { ok: false, message: 'Dados do veículo indisponíveis.' };
  }

  return {
    ok: true,
    authUserId,
    driverId: ownership.driver.id,
    form,
  };
}

export type SaveVehicleOnlyResult =
  | { ok: true }
  | { ok: false; message: string; persistenceFailed?: boolean };

export async function saveVehicleOnlyUpdate(params: {
  authUserId: string | undefined;
  boundUserId: string | null;
  boundDriverId: string | null;
  vehicleReady: boolean;
  form: VehicleFormState;
  service: DriverVehicleServicePort;
}): Promise<SaveVehicleOnlyResult> {
  const { authUserId, boundUserId, boundDriverId, vehicleReady, form, service } = params;

  if (!authUserId) {
    return { ok: false, message: 'Usuário não autenticado.' };
  }
  if (!vehicleReady || !boundDriverId || !boundUserId) {
    return { ok: false, message: 'Dados do veículo ainda não foram carregados.' };
  }
  if (authUserId !== boundUserId) {
    return { ok: false, message: 'Sessão alterada. Recarregue os dados do veículo.' };
  }

  const validation = validateVehicleForm(form);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const fresh = await service.getDriverByUserId(authUserId);
  const ownership = assertDriverOwnership(authUserId, fresh);
  if (!ownership.ok) {
    return { ok: false, message: ownership.message };
  }
  if (ownership.driver.id !== boundDriverId) {
    return { ok: false, message: 'Identidade do registro divergente. Operação abortada.' };
  }

  try {
    await service.updateDriver(ownership.driver.id, validation.payload);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: 'Não foi possível salvar os dados do veículo. Tente novamente.',
      persistenceFailed: true,
    };
  }
}

export const DriverVehicleScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const driverService = useMemo(() => new DeliveryDriverService(), []);
  const authUserId = UserUtils.getUserId(user) || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [boundUserId, setBoundUserId] = useState<string | null>(null);
  const [boundDriverId, setBoundDriverId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleFormState>(emptyVehicleForm());
  const [vehicleReady, setVehicleReady] = useState(false);

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setVehicleReady(false);
    setBoundUserId(null);
    setBoundDriverId(null);
    setForm(emptyVehicleForm());

    try {
      const result = await loadDriverVehicleForEdit(authUserId || undefined, driverService);
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setBoundUserId(result.authUserId);
      setBoundDriverId(result.driverId);
      setForm(result.form);
      setVehicleReady(true);
    } catch {
      setLoadError('Não foi possível carregar os dados do veículo.');
    } finally {
      setLoading(false);
    }
  }, [authUserId, driverService]);

  useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveVehicleOnlyUpdate({
        authUserId: authUserId || undefined,
        boundUserId,
        boundDriverId,
        vehicleReady,
        form,
        service: driverService,
      });

      if (!result.ok) {
        Alert.alert('Erro', result.message);
        return;
      }

      Alert.alert('Sucesso', 'Dados do veículo atualizados.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator animating testID="driver-vehicle-loading" />
        <Text style={styles.hint}>Carregando veículo…</Text>
      </SafeAreaView>
    );
  }

  if (loadError || !vehicleReady) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText} testID="driver-vehicle-load-error">
          {loadError || 'Não foi possível abrir o editor de veículo.'}
        </Text>
        <Button mode="outlined" onPress={() => void loadVehicle()} style={styles.retryBtn}>
          Tentar novamente
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Voltar ao perfil
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="driver-vehicle-screen">
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Meu Veículo</Text>
        <Text style={styles.subtitle}>
          Edite apenas os dados do veículo. Documentos e demais dados do cadastro não são alterados.
        </Text>

        <TextInput
          mode="outlined"
          label="Tipo (motorcycle, car, bicycle)"
          value={form.type}
          onChangeText={type => setForm(prev => ({ ...prev, type }))}
          style={styles.input}
          autoCapitalize="none"
          testID="vehicle-type"
        />
        <TextInput
          mode="outlined"
          label="Marca"
          value={form.brand}
          onChangeText={brand => setForm(prev => ({ ...prev, brand }))}
          style={styles.input}
          testID="vehicle-brand"
        />
        <TextInput
          mode="outlined"
          label="Modelo"
          value={form.model}
          onChangeText={model => setForm(prev => ({ ...prev, model }))}
          style={styles.input}
          testID="vehicle-model"
        />
        <TextInput
          mode="outlined"
          label="Ano"
          value={form.year}
          onChangeText={year => setForm(prev => ({ ...prev, year }))}
          style={styles.input}
          keyboardType="numeric"
          testID="vehicle-year"
        />
        <TextInput
          mode="outlined"
          label="Placa"
          value={form.plate}
          onChangeText={plate => setForm(prev => ({ ...prev, plate }))}
          style={styles.input}
          autoCapitalize="characters"
          testID="vehicle-plate"
        />
        <TextInput
          mode="outlined"
          label="Cor"
          value={form.color}
          onChangeText={color => setForm(prev => ({ ...prev, color }))}
          style={styles.input}
          testID="vehicle-color"
        />

        <Button
          mode="contained"
          onPress={() => void handleSave()}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
          testID="vehicle-save"
        >
          Salvar veículo
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()} disabled={saving}>
          Voltar ao perfil
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  saveBtn: { marginTop: 8, marginBottom: 8, borderRadius: 10 },
  hint: { marginTop: 12, color: '#666' },
  errorText: { textAlign: 'center', color: '#C62828', marginBottom: 16, fontSize: 15 },
  retryBtn: { marginBottom: 8 },
});

export default DriverVehicleScreen;

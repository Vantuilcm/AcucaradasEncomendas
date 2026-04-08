import { f } from '../config/firebase';
const { doc, getDoc, setDoc, serverTimestamp } = f;
import { db } from '../config/firebase';
import { loggingService } from './LoggingService';

export interface ReleaseHealth {
  crashRate: number;
  paymentFailureRate: number;
  criticalErrors: number;
}

export interface ReleaseItem {
  version: string;
  buildNumber: number;
  status: 'STABLE' | 'DEGRADED' | 'CRITICAL';
  channel: 'production' | 'production-safe' | 'production-canary';
  rollout: number; // 0.1 to 1.0
  lastCheck: any;
  rollbackTriggered: boolean;
  blocked: boolean;
  health?: ReleaseHealth;
  anomalies?: string[];
}

export interface ReleaseState {
  activeReleaseId: string;
  releases: Record<string, ReleaseItem>;
  lastStableReleaseId: string;
}

export class ReleaseService {
  private static instance: ReleaseService;
  private readonly RELEASE_DOC_ID = 'current_release';

  private constructor() {
    loggingService.info('ReleaseService: Iniciado');
  }

  public static getInstance(): ReleaseService {
    if (!ReleaseService.instance) {
      ReleaseService.instance = new ReleaseService();
    }
    return ReleaseService.instance;
  }

  /**
   * Monitora o estado da release em tempo real
   */
  public subscribeToReleaseState(callback: (state: ReleaseState) => void) {
    return onSnapshot(doc(db, 'system_state', this.RELEASE_DOC_ID), (snap: any) => {
      if (snap.exists()) {
        callback(snap.data() as unknown as ReleaseState);
      }
    });
  }

  /**
   * Atualiza o estado da release (chamado pelo monitor ou admin)
   */
  public async updateReleaseState(state: Partial<ReleaseState>): Promise<void> {
    try {
      const ref = doc(db, 'system_state', this.RELEASE_DOC_ID);
      const updateData: any = {
        ...state,
        updatedAt: serverTimestamp()
      };
      await setDoc(ref, updateData, { merge: true });
      loggingService.info('ReleaseService: Estado atualizado', state);
    } catch (error: any) {
      loggingService.error('ReleaseService: Erro ao atualizar estado', { error: error.message });
    }
  }

  /**
   * Verifica se a release ativa está bloqueada
   */
  public async isReleaseBlocked(): Promise<boolean> {
    const snap = await getDoc(doc(db, 'system_state', this.RELEASE_DOC_ID));
    if (snap.exists()) {
      const data = snap.data() as unknown as ReleaseState;
      const activeRelease = data.releases[data.activeReleaseId];
      return activeRelease ? (activeRelease.status === 'CRITICAL' || activeRelease.blocked) : false;
    }
    return false;
  }
}

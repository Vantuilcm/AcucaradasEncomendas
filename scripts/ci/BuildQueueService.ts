import fs from 'fs';
import path from 'path';

export type BuildPriority = 'high' | 'medium' | 'low';

export interface BuildJob {
  id: string;
  appId: string;
  env: string;
  priority: BuildPriority;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retries: number;
  timestamp: string;
}

export class BuildQueueService {
  private queueFile: string;

  constructor() {
    this.queueFile = path.resolve(process.cwd(), 'build-logs', 'build_queue.json');
    this.ensureQueueFile();
  }

  private ensureQueueFile() {
    const dir = path.dirname(this.queueFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.queueFile)) {
      fs.writeFileSync(this.queueFile, JSON.stringify([], null, 2));
    }
  }

  public async addToQueue(appId: string, env: string, priority: BuildPriority): Promise<BuildJob> {
    const queue = this.getQueue();
    const job: BuildJob = {
      id: `${appId}-${Date.now()}`,
      appId,
      env,
      priority: env === 'production' ? 'high' : priority,
      status: 'pending',
      retries: 0,
      timestamp: new Date().toISOString()
    };

    queue.push(job);
    this.saveQueue(queue);
    console.log(`📦 [QUEUE] Job added for ${appId} (Priority: ${job.priority})`);
    return job;
  }

  public getNextJob(): BuildJob | null {
    const queue = this.getQueue();
    const pendingJobs = queue.filter(j => j.status === 'pending');
    
    if (pendingJobs.length === 0) return null;

    // Sort by priority (high > medium > low) and then by timestamp
    const priorityMap: Record<BuildPriority, number> = { high: 3, medium: 2, low: 1 };
    
    pendingJobs.sort((a, b) => {
      const pDiff = priorityMap[b.priority] - priorityMap[a.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    return pendingJobs[0];
  }

  public updateJobStatus(jobId: string, status: BuildJob['status'], _details: any = {}) {
    const queue = this.getQueue();
    const jobIndex = queue.findIndex(j => j.id === jobId);
    
    if (jobIndex !== -1) {
      queue[jobIndex].status = status;
      if (status === 'failed') {
        queue[jobIndex].retries += 1;
      }
      this.saveQueue(queue);
      console.log(`🔄 [QUEUE] Job ${jobId} status updated to ${status}`);
    }
  }

  public getQueue(): BuildJob[] {
    try {
      return JSON.parse(fs.readFileSync(this.queueFile, 'utf-8'));
    } catch {
      return [];
    }
  }

  private saveQueue(queue: BuildJob[]) {
    fs.writeFileSync(this.queueFile, JSON.stringify(queue, null, 2));
  }

  public isAppBuilding(appId: string): boolean {
    return this.getQueue().some(j => j.appId === appId && j.status === 'running');
  }
}

export default new BuildQueueService();

/**
 * 文件系统服务
 * 处理视频下载和保存功能
 * 使用存储设置的通用路径
 */

import { SoraTaskGroup, SoraVideoResult } from '../types';

/**
 * 格式化时间戳为文件名
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hour}${minute}${second}`;
}

/**
 * 生成视频文件名
 */
function generateVideoFileName(taskNumber: number, timestamp: Date): string {
  const ts = formatTimestamp(timestamp);
  return `sora_task_${taskNumber}_${ts}.mp4`;
}

/**
 * 下载文件并转换为 Blob
 */
export async function downloadFileAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`);
  }
  return await response.blob();
}

/**
 * 保存视频文件到本地
 * 使用存储设置的通用路径
 */
export async function saveVideoFile(
  videoUrl: string,
  taskGroup: SoraTaskGroup,
  isWatermarked: boolean = false
): Promise<string> {
  try {
    // 1. 下载视频
    const blob = await downloadFileAsBlob(videoUrl);

    // 2. 生成文件名
    const timestamp = new Date();
    const fileName = generateVideoFileName(taskGroup.taskNumber, timestamp);

    // 3. 使用 File System Access API 保存文件
    let fileHandle: FileSystemFileHandle;

    if ('showSaveFilePicker' in window) {
      // 浏览器支持 File System Access API
      fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Video File',
          accept: { 'video/mp4': ['.mp4'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      // 返回文件句柄的名称（用于标识）
      return fileHandle.name;
    } else {
      // 降级方案：使用传统的下载方式
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return fileName;
    }
  } catch (error: any) {
    console.error('[File System Service] Save video failed:', error);
    throw new Error(`保存视频失败: ${error.message}`);
  }
}

/**
 * 批量保存视频文件
 */
export async function saveMultipleVideoFiles(
  results: Map<string, SoraVideoResult>,
  taskGroups: SoraTaskGroup[],
  onProgress?: (index: number, total: number, fileName: string) => void
): Promise<Map<string, string>> {
  const savedPaths = new Map<string, string>();

  for (let i = 0; i < taskGroups.length; i++) {
    const taskGroup = taskGroups[i];
    const result = results.get(taskGroup.id);

    if (result && result.status === 'completed' && result.videoUrl) {
      try {
        const filePath = await saveVideoFile(result.videoUrl, taskGroup, false);
        savedPaths.set(taskGroup.id, filePath);

        onProgress?.(i + 1, taskGroups.length, filePath);
      } catch (error: any) {
        console.error(`Failed to save video for task ${taskGroup.taskNumber}:`, error);
        savedPaths.set(taskGroup.id, error.message);
      }
    }
  }

  return savedPaths;
}

/**
 * 保存参考图到本地
 */
export async function saveReferenceImage(
  imageData: string,
  taskGroup: SoraTaskGroup
): Promise<string> {
  try {
    let blob: Blob;

    if (imageData.startsWith('data:')) {
      // Base64 格式
      const response = await fetch(imageData);
      blob = await response.blob();
    } else {
      // URL 格式
      blob = await downloadFileAsBlob(imageData);
    }

    const timestamp = new Date();
    const ts = formatTimestamp(timestamp);
    const fileName = `sora_ref_${taskGroup.taskNumber}_${ts}.png`;

    if ('showSaveFilePicker' in window) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Image File',
          accept: { 'image/png': ['.png'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      return fileHandle.name;
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return fileName;
    }
  } catch (error: any) {
    console.error('[File System Service] Save reference image failed:', error);
    throw new Error(`保存参考图失败: ${error.message}`);
  }
}

/**
 * 保存视频元数据为 JSON
 */
export async function saveVideoMetadata(
  taskGroup: SoraTaskGroup,
  result: SoraVideoResult
): Promise<void> {
  try {
    const metadata = {
      taskGroupId: taskGroup.id,
      taskNumber: taskGroup.taskNumber,
      totalDuration: taskGroup.totalDuration,
      shotCount: taskGroup.shotIds.length,
      soraPrompt: taskGroup.soraPrompt,
      soraTaskId: result.taskId,
      videoUrl: result.videoUrl,
      videoUrlWatermarked: result.videoUrlWatermarked,
      duration: result.duration,
      quality: result.quality,
      isCompliant: result.isCompliant,
      violationReason: result.violationReason,
      videoMetadata: taskGroup.videoMetadata,
      generatedAt: new Date().toISOString()
    };

    const timestamp = new Date();
    const ts = timestamp.getTime().toString();
    const fileName = `sora_meta_${taskGroup.taskNumber}_${ts}.json`;

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });

    if ('showSaveFilePicker' in window) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error: any) {
    console.error('[File System Service] Save metadata failed:', error);
    // 元数据保存失败不影响主流程
  }
}

/**
 * 生成使用日志
 */
export function generateUsageLog(
  taskGroups: SoraTaskGroup[],
  results: Map<string, SoraVideoResult>
): string {
  const timestamp = new Date().toISOString();
  const successCount = Array.from(results.values()).filter(r => r.status === 'completed').length;
  const failedCount = taskGroups.length - successCount;

  let log = `# Sora 2 视频生成日志\n`;
  log += `生成时间: ${timestamp}\n`;
  log += `总任务数: ${taskGroups.length}\n`;
  log += `成功: ${successCount}\n`;
  log += `失败: ${failedCount}\n\n`;

  taskGroups.forEach(taskGroup => {
    const result = results.get(taskGroup.id);
    log += `## 任务组 ${taskGroup.taskNumber}\n`;
    log += `- ID: ${taskGroup.id}\n`;
    log += `- 时长: ${taskGroup.totalDuration}秒\n`;
    log += `- 分镜数: ${taskGroup.shotIds.length}\n`;
    log += `- 状态: ${result?.status || 'unknown'}\n`;
    if (result?.status === 'completed') {
      log += `- 视频时长: ${result.duration}\n`;
      log += `- 质量检测: ${result.isCompliant ? '通过' : '未通过 (' + result.violationReason + ')'}\n`;
    }
    if (taskGroup.error) {
      log += `- 错误: ${taskGroup.error}\n`;
    }
    log += `\n`;
  });

  return log;
}

/**
 * 保存使用日志
 */
export async function saveUsageLog(
  taskGroups: SoraTaskGroup[],
  results: Map<string, SoraVideoResult>
): Promise<void> {
  try {
    const logContent = generateUsageLog(taskGroups, results);
    const timestamp = new Date();
    const ts = timestamp.getTime().toString();
    const fileName = `sora_log_${ts}.md`;

    const blob = new Blob([logContent], { type: 'text/markdown' });

    if ('showSaveFilePicker' in window) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Markdown File',
          accept: { 'text/markdown': ['.md'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error: any) {
    console.error('[File System Service] Save usage log failed:', error);
    // 日志保存失败不影响主流程
  }
}

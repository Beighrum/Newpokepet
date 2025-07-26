import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download, 
  Play,
  Pause,
  X,
  Eye,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VideoGenerationJob } from '@/services/videoGenerationService';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { cn } from '@/lib/utils';

interface VideoJobQueueProps {
  className?: string;
  maxItems?: number;
  showCompleted?: boolean;
}

const VideoJobQueue: React.FC<VideoJobQueueProps> = ({
  className = '',
  maxItems = 10,
  showCompleted = true
}) => {
  const { jobs, queueStatus, cancelJob, refreshJobs } = useVideoGeneration();
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const filteredJobs = jobs
    .filter(job => showCompleted || job.status !== 'completed')
    .slice(0, maxItems);

  const toggleExpanded = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const getStatusIcon = (status: VideoGenerationJob['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: VideoGenerationJob['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleDownload = (job: VideoGenerationJob) => {
    if (job.result?.videoUrl) {
      const link = document.createElement('a');
      link.href = job.result.videoUrl;
      link.download = `${job.cardId}_video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = (job: VideoGenerationJob) => {
    if (job.result?.videoUrl) {
      window.open(job.result.videoUrl, '_blank');
    }
  };

  if (filteredJobs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Video Jobs</h3>
          <p className="text-gray-500">Start generating videos to see them here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Play className="w-5 h-5 mr-2 text-purple-600" />
              Video Generation Queue
            </CardTitle>
            <CardDescription>
              Track your video generation progress ({filteredJobs.length} jobs)
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Queue: {queueStatus.queueLength}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Processing: {queueStatus.processing}/{queueStatus.maxConcurrent}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshJobs}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {filteredJobs.map((job) => {
          const isExpanded = expandedJobs.has(job.id);
          const canCancel = job.status === 'queued' || job.status === 'processing';
          const isCompleted = job.status === 'completed' && job.result;

          return (
            <div
              key={job.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
            >
              {/* Job Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="font-medium text-sm">Card: {job.cardId}</div>
                    <div className="text-xs text-gray-500">
                      {job.request.resolution} • {job.request.quality} • {formatDuration(job.request.duration)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={cn('text-xs', getStatusColor(job.status))}>
                    {job.status}
                  </Badge>
                  
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(job.updatedAt)}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleExpanded(job.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {isExpanded ? 'Hide' : 'Show'} Details
                      </DropdownMenuItem>
                      
                      {isCompleted && (
                        <>
                          <DropdownMenuItem onClick={() => handlePreview(job)}>
                            <Play className="mr-2 h-4 w-4" />
                            Preview Video
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(job)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {canCancel && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => cancelJob(job.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel Job
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Progress Bar */}
              {(job.status === 'processing' || job.status === 'queued') && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(job.progress)}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                  
                  {job.estimatedCompletionTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      ETA: {new Date(job.estimatedCompletionTime).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {job.status === 'failed' && job.error && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                  <div className="text-sm text-red-800">{job.error}</div>
                </div>
              )}

              {/* Completed Video Preview */}
              {isCompleted && (
                <div className="mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={job.result.thumbnailUrl}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Video Ready
                      </div>
                      <div className="text-xs text-gray-600">
                        {job.result.resolution} • {formatFileSize(job.result.fileSize)}
                      </div>
                      <div className="flex space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(job)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(job)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Job ID:</span>
                      <span className="ml-2 font-mono text-xs">{job.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Style:</span>
                      <span className="ml-2 capitalize">{job.request.style}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2">{new Date(job.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Updated:</span>
                      <span className="ml-2">{new Date(job.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {job.request.prompt && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Generation Prompt:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                        {job.request.prompt}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default VideoJobQueue;
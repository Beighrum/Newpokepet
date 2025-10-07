import type React from "react"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon, X } from "lucide-react"

interface UploaderCardProps {
  onFileSelect: (file: File) => void
  maxSizeMB?: number
  acceptedTypes?: string[]
  className?: string
}

export function UploaderCard({
  onFileSelect,
  maxSizeMB = 10,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  className = "",
}: UploaderCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return "Please upload a valid image file (JPEG, PNG, or WebP)"
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`
    }
    return null
  }

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      setError(null)
      setSelectedFile(file)

      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      onFileSelect(file)
    },
    [onFileSelect, maxSizeMB, acceptedTypes],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setError(null)
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Upload Pet Photo</h3>

        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-colors ${
              isDragOver
                ? "border-purple-400 bg-purple-50"
                : "border-gray-300 hover:border-purple-300 hover:bg-purple-25"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Drop your pet photo here</p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
            <input
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline" className="rounded-full bg-transparent">
              <label htmlFor="file-upload" className="cursor-pointer">
                <ImageIcon className="w-4 h-4 mr-2" />
                Choose File
              </label>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Max {maxSizeMB}MB • JPEG, PNG, WebP</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img src={previewUrl || ""} alt="Selected pet" className="w-full h-48 object-cover rounded-2xl" />
              <Button
                variant="destructive"
                size="sm"
                onClick={clearFile}
                className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Remove image</span>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">{selectedFile.name}</p>
              <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
      </div>
    </Card>
  )
}

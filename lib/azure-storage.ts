import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

function getContainerClient(containerName: string): ContainerClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  }
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  return blobServiceClient.getContainerClient(containerName);
}

export async function uploadResume(
  file: Buffer,
  fileName: string,
  applicationId: string,
  contentType: string
): Promise<string> {
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_RESUMES || "rlai-resumes";
  const containerClient = getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blobName = `${applicationId}/${Date.now()}-${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(file, file.length, {
    blobHTTPHeaders: { blobContentType: contentType },
    metadata: {
      applicationId,
      originalName: fileName,
      uploadedAt: new Date().toISOString(),
    },
  });

  return blockBlobClient.url;
}

export async function uploadDiagram(
  file: Buffer,
  fileName: string,
  applicationId: string,
  questionId: string,
  contentType: string
): Promise<string> {
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_DIAGRAMS || "rlai-diagrams";
  const containerClient = getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blobName = `${applicationId}/${questionId}/${Date.now()}-${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.upload(file, file.length, {
    blobHTTPHeaders: { blobContentType: contentType },
    metadata: { applicationId, questionId, originalName: fileName },
  });

  return blockBlobClient.url;
}

export async function generateSasUrl(
  blobUrl: string,
  expiresInMinutes = 60
): Promise<string> {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) return blobUrl;

    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    const urlParts = new URL(blobUrl);
    const pathParts = urlParts.pathname.split("/");
    const containerName = pathParts[1];
    const blobName = pathParts.slice(2).join("/");

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

    const sasUrl = await blobClient.generateSasUrl({
      permissions: { read: true } as never,
      expiresOn,
    });

    return sasUrl;
  } catch {
    return blobUrl;
  }
}

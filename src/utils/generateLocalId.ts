/** Generate a locally-unique ID for highlights created before Firestore sync. */
export const generateLocalId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `local_${timestamp}_${random}`;
};

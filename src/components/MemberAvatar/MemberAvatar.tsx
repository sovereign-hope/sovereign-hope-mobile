/* eslint-disable unicorn/no-null */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { styles, modalStyles } from "./MemberAvatar.styles";

type Props = {
  photoURL: string | null;
  displayName: string;
  size: number;
};

export type MemberAvatarHandle = {
  /** Open the enlarged photo modal (no-op when the member has no photo). */
  showPhoto: () => void;
};

const ENLARGED_SIZE = 240;

const getDisplayInitial = (displayName: string): string => {
  const trimmedName = displayName.trim();
  if (!trimmedName) {
    return "?";
  }

  return trimmedName[0].toUpperCase();
};

const MemberAvatarInner: React.ForwardRefRenderFunction<
  MemberAvatarHandle,
  Props
> = ({ photoURL, displayName, size }, ref) => {
  const theme = useTheme();
  const themedStyles = useMemo(() => styles({ theme, size }), [theme, size]);
  const themedModalStyles = useMemo(
    () => modalStyles({ theme, size: ENLARGED_SIZE }),
    [theme]
  );
  const [failedPhotoURL, setFailedPhotoURL] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const hasPhoto = Boolean(photoURL && photoURL !== failedPhotoURL);

  const handlePress = useCallback(() => {
    if (hasPhoto) {
      setIsModalVisible(true);
    }
  }, [hasPhoto]);

  const handleDismiss = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  useImperativeHandle(ref, () => ({ showPhoto: handlePress }), [handlePress]);

  if (!hasPhoto) {
    return (
      <View
        style={[themedStyles.avatarBase, themedStyles.fallbackContainer]}
        accessibilityLabel={`Avatar fallback for ${displayName}`}
        accessibilityHint={`Initials avatar for ${displayName}`}
      >
        <Text style={themedStyles.fallbackText}>
          {getDisplayInitial(displayName)}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={handlePress} accessibilityRole="button">
        <Image
          source={{ uri: photoURL as string }}
          style={themedStyles.image}
          recyclingKey={photoURL as string}
          cachePolicy="disk"
          transition={150}
          onError={() => setFailedPhotoURL(photoURL)}
          accessibilityLabel={`Photo of ${displayName}`}
          accessibilityHint="Tap to view larger photo"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
        statusBarTranslucent
      >
        <Pressable
          style={themedModalStyles.backdrop}
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          accessibilityHint="Tap anywhere to dismiss"
        >
          <View style={themedModalStyles.content}>
            <Image
              source={{ uri: photoURL as string }}
              style={themedModalStyles.enlargedImage}
              cachePolicy="disk"
              contentFit="cover"
              accessibilityLabel={`Enlarged photo of ${displayName}`}
              accessibilityHint="Large member photo"
              accessibilityIgnoresInvertColors
            />
            <Text style={themedModalStyles.name}>{displayName}</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export const MemberAvatar = forwardRef(MemberAvatarInner);

/* eslint-enable unicorn/no-null */

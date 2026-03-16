/* eslint-disable unicorn/no-null */
import React, { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { styles, modalStyles } from "./MemberAvatar.styles";

type Props = {
  photoURL: string | null;
  displayName: string;
  size: number;
};

const ENLARGED_SIZE = 240;

const getDisplayInitial = (displayName: string): string => {
  const trimmedName = displayName.trim();
  if (!trimmedName) {
    return "?";
  }

  return trimmedName[0].toUpperCase();
};

export const MemberAvatar: React.FunctionComponent<Props> = ({
  photoURL,
  displayName,
  size,
}: Props) => {
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

/* eslint-enable unicorn/no-null */

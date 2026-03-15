/* eslint-disable unicorn/no-null */
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { styles } from "./MemberAvatar.styles";

type Props = {
  photoURL: string | null;
  displayName: string;
  size: number;
};

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
  const [failedPhotoURL, setFailedPhotoURL] = useState<string | null>(null);

  if (photoURL && photoURL !== failedPhotoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={themedStyles.image}
        recyclingKey={photoURL}
        cachePolicy="disk"
        transition={150}
        onError={() => setFailedPhotoURL(photoURL)}
        accessibilityLabel={`Photo of ${displayName}`}
        accessibilityHint={`Member profile image for ${displayName}`}
        accessibilityIgnoresInvertColors
      />
    );
  }

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
};

/* eslint-enable unicorn/no-null */

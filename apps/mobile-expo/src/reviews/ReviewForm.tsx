import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { REVIEW_RATING_MAX, color } from '@spot/shared';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ActionButtons } from '@/components/ActionButtons';
import { ErrorMessage } from '@/components/ErrorMessage';
import { TextField } from '@/components/TextField';
import { font } from '@/theme/fonts';

interface ReviewFormProps {
  /** Keeps the label's id unique on the screen. */
  bookingId: string;
  submitting: boolean;
  /** Why the last submit failed, shown under the button. */
  error: string | null;
  onSubmit: (rating: number, comment: string | undefined) => void;
  onCancel: () => void;
}

/** The inline "Dejar reseña" form of a completed booking: a 1-5 rating and an optional comment (#29). */
export function ReviewForm({ bookingId, submitting, error, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const labelId = `review-rating-label-${bookingId}`;

  function submit() {
    if (rating === 0 || submitting) return;
    // A blank comment is sent as no comment (the API stores it as null anyway).
    onSubmit(rating, comment.trim() || undefined);
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label} nativeID={labelId}>
        Calificación
      </Text>
      {/* aria-labelledby names it on web; native screen readers need the label itself. */}
      <View style={styles.stars} role="radiogroup" aria-labelledby={labelId} accessibilityLabel="Calificación">
        {Array.from({ length: REVIEW_RATING_MAX }, (_, i) => i + 1).map((value) => (
          <Pressable
            key={value}
            onPress={() => setRating(value)}
            disabled={submitting}
            role="radio"
            aria-checked={rating === value}
            aria-label={value === 1 ? '1 estrella' : `${value} estrellas`}
            style={styles.star}
          >
            <Text style={[styles.starText, value <= rating && styles.starSelected]}>{value <= rating ? '★' : '☆'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint} role="status">
        {rating === 0 ? 'Elegí de 1 a 5 estrellas.' : `${rating} de ${REVIEW_RATING_MAX}`}
      </Text>

      <TextField
        label="Comentario (opcional)"
        // TextField's visible label isn't tied to its input: without this the field is read by its placeholder.
        accessibilityLabel="Comentario (opcional)"
        value={comment}
        onChangeText={setComment}
        editable={!submitting}
        multiline
        placeholder="¿Cómo te fue?"
        style={styles.comment}
      />

      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      <ActionButtons style={styles.actions}>
        <PrimaryButton title="Cancelar" variant="secondary" compact onPress={onCancel} disabled={submitting} />
        <PrimaryButton
          title="Enviar reseña"
          compact
          onPress={submit}
          loading={submitting}
          disabled={rating === 0}
          accessibilityHint={rating === 0 ? 'Elegí una calificación primero.' : undefined}
        />
      </ActionButtons>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 8,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: font.semibold,
    color: color.textSecondary,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  // 44 x 44 so each star is easy to hit.
  star: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 28,
    fontFamily: font.regular,
    color: color.textSecondary,
  },
  starSelected: {
    color: color.accentTeal,
  },
  hint: {
    fontSize: 13,
    fontFamily: font.regular,
    color: color.textSecondary,
    marginBottom: 8,
  },
  comment: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 8,
  },
});

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Movie } from '../../models/movie';

export interface ItemFormData {
  mode: 'create' | 'edit';
  item?: Movie;
}

@Component({
  selector: 'app-item-form',
  templateUrl: './item-form.component.html',
  styleUrls: ['./item-form.component.scss']
})
export class ItemFormComponent implements OnInit {
  form!: FormGroup;
  mode: 'create' | 'edit' = 'create';

  // patrón simple para URL de imagen (jpg|jpeg|png|webp|gif), admite query string
  private imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i;
  private currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ItemFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ItemFormData
  ) {
    if (data && data.mode) this.mode = data.mode;
  }

  ngOnInit() {
    const item: Partial<Movie> = (this.data && this.data.item) ? this.data.item : {};

    const initialPoster = item.posterUrls?.w500 ?? (item as any).poster_path ?? '';

    this.form = this.fb.group({
      id: [item.id ?? null],
      title: [ (item.title ?? '').trim(), [Validators.required, Validators.minLength(2)] ],
      year: [ item.year ?? '', [Validators.required, Validators.pattern(/^\d{4}$/), this.yearRangeValidator.bind(this)] ],
      poster: [ initialPoster ?? '', [Validators.required, Validators.pattern(this.imageUrlPattern)] ],
      overview: [ item.overview ?? '', [Validators.maxLength(2000)] ]
    });
  }

  // Validador custom: año entre 1888 y currentYear+1
  private yearRangeValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null; // other validators handle required/pattern
    const yearNum = Number(v);
    if (isNaN(yearNum)) return { invalidYear: true };
    if (yearNum < 1888 || yearNum > (this.currentYear + 1)) {
      return { yearOutOfRange: { min: 1888, max: this.currentYear + 1 } };
    }
    return null;
  }

  get titleControl() { return this.form.get('title'); }
  get yearControl() { return this.form.get('year'); }
  get posterControl() { return this.form.get('poster'); }
  get overviewControl() { return this.form.get('overview'); }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fv = this.form.value;

    // normalizar strings
    const title = String(fv.title).trim();
    const year = String(fv.year).trim();
    const posterUrl = String(fv.poster).trim();
    const overview = fv.overview ? String(fv.overview).trim() : undefined;

    const movie: Movie = {
      id: fv.id ?? undefined,
      title,
      year,
      overview,
      original_language: undefined,
      poster_path: undefined,
      posterUrls: posterUrl ? { w500: posterUrl } : undefined
    } as Movie;

    if (this.mode === 'create') {
      delete (movie as any).id;
    }

    this.dialogRef.close(movie);
  }

  cancel() {
    this.dialogRef.close();
  }
}

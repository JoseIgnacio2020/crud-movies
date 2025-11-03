import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Movie } from '../../models/movie';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

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
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  mode: 'create' | 'edit' = 'create';

  // Aceptamos: data:image/... (base64)  o  https?://...jpg|jpeg|png|webp|gif (con query opcional)
  private imageUrlOrDataPattern = /^(data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+|https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?)$/i;

  private MAX_FILE_BYTES = 1.5 * 1024 * 1024;
  public imgLoadError = false;
  public fileErrorMessage: string | null = null;

  // expuesto a la plantilla en lugar de usar new Date() dentro del template
  public maxYear = new Date().getFullYear() + 1;
  private currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ItemFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ItemFormData,
    private dialog: MatDialog
  ) {
    if (data && data.mode) this.mode = data.mode;
  }

  ngOnInit() {
    const item: Partial<Movie> = (this.data && this.data.item) ? this.data.item : {};
    const initialPoster = item.posterUrls?.w500 ?? (item as any).poster_path ?? '';

    this.form = this.fb.group({
      id: [item.id ?? null],
      title: [(item.title ?? '').trim(), [Validators.required, Validators.minLength(2)]],
      year: [
        item.year ?? '',
        [
          Validators.required,
          Validators.min(1888),
          Validators.max(this.currentYear + 1),
          this.fourDigitsValidator.bind(this)
        ]
      ],
      poster: [initialPoster ?? '', [Validators.required, Validators.pattern(this.imageUrlOrDataPattern)]],
      overview: [item.overview ?? '', [Validators.maxLength(2000)]],
      _posterMode: ['url']
    });
  }

  private fourDigitsValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (v === null || v === undefined || v === '') return null;
    const intVal = Number(v);
    if (!Number.isInteger(intVal)) return { notInteger: true };
    if (intVal < 1000 || intVal > 9999) return { fourDigits: true };
    return null;
  }

  /* getters */
  get titleControl() { return this.form.get('title'); }
  get yearControl() { return this.form.get('year'); }
  get posterControl() { return this.form.get('poster'); }
  get overviewControl() { return this.form.get('overview'); }
  get posterModeControl() { return this.form.get('_posterMode'); }

  /* file handling */
  triggerFilePicker() {
    // abrir el input file usando ViewChild/template ref
    this.fileInputRef?.nativeElement?.click();
  }

  async onFileSelected(ev: Event) {
    this.fileErrorMessage = null;
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (file.size > this.MAX_FILE_BYTES) {
      this.fileErrorMessage = `Archivo demasiado grande (máx ${(this.MAX_FILE_BYTES / 1024 / 1024).toFixed(1)} MB).`;
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.fileErrorMessage = 'El archivo debe ser una imagen.';
      return;
    }

    try {
      const dataUrl = await this.readFileAsDataUrl(file);
      this.posterModeControl?.setValue('upload');
      this.posterControl?.setValue(dataUrl);
      this.imgLoadError = false;
    } catch (err) {
      console.error('Error leyendo archivo', err);
      this.fileErrorMessage = 'No se pudo leer el archivo.';
    } finally {
      if (input) input.value = '';
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        if (typeof fr.result === 'string') res(fr.result);
        else rej('Formato inesperado');
      };
      fr.onerror = (e) => rej(e);
      fr.readAsDataURL(file);
    });
  }

  onImgError() { this.imgLoadError = true; }

  setPosterMode(mode: 'url' | 'upload') {
    this.posterModeControl?.setValue(mode);
    this.fileErrorMessage = null;
    this.imgLoadError = false;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const fv = this.form.value;
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
      this.dialogRef.close(movie);
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Guardar cambios',
        message: `¿Guardar cambios en <strong>${movie.title}</strong>?`,
        confirmText: 'Guardar',
        cancelText: 'Cancelar'
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.dialogRef.close(movie);
    });
  }

  cancel() { this.dialogRef.close(); }
}
